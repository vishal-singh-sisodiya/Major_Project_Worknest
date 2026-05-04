import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext.jsx'

const SocketContext = createContext(null)

const socketURL = import.meta.env.VITE_API_URL || ''

export function SocketProvider({ children }) {
  const { token, user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }
    const s = io(socketURL || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    setSocket(s)
    return () => {
      s.disconnect()
      setSocket(null)
    }
  }, [token, socketURL])

  const joinWorkspace = useCallback(
    (workspaceId) => {
      if (!socket || !workspaceId || !user) return
      socket.emit('join-workspace', {
        workspaceId,
        userId: user._id,
        name: user.name,
      })
    },
    [socket, user]
  )

  useEffect(() => {
    if (!socket || !user?._id) return
    socket.emit('join-user', { userId: user._id })
  }, [socket, user?._id])

  useEffect(() => {
    if (!socket) return
    const onOnline = ({ users }) => setOnlineUsers(users || [])
    socket.on('online-users', onOnline)
    return () => socket.off('online-users', onOnline)
  }, [socket])

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, joinWorkspace }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
