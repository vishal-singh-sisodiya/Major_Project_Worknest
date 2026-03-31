import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSocket } from '../../context/SocketContext.jsx'
import api from '../../utils/api.js'

export function ChatBox({ workspaceId }) {
  const { user } = useAuth()
  const { socket, joinWorkspace } = useSocket()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(null)
  const bottomRef = useRef(null)
  const typingTimeout = useRef(null)

  useEffect(() => {
    if (!workspaceId) return
    joinWorkspace(workspaceId)
    api
      .get(`/workspaces/${workspaceId}/messages`)
      .then(({ data }) => Array.isArray(data) && setMessages(data))
      .catch(() => setMessages([]))
  }, [workspaceId, joinWorkspace])

  useEffect(() => {
    if (!socket || !workspaceId) return
    const onMessage = ({ message }) => setMessages((m) => [...m, message])
    const onTyping = ({ userId, name }) => {
      if (userId !== user?._id) setTyping(name)
    }
    const onStop = ({ userId }) => {
      if (userId !== user?._id) setTyping(null)
    }
    socket.on('new-message', onMessage)
    socket.on('user-typing', onTyping)
    socket.on('stop-typing', onStop)
    return () => {
      socket.off('new-message', onMessage)
      socket.off('user-typing', onTyping)
      socket.off('stop-typing', onStop)
    }
  }, [socket, workspaceId, user?._id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (e) => {
    e.preventDefault()
    if (!text.trim() || !workspaceId || !user) return
    socket?.emit('send-message', {
      workspaceId,
      message: { text: text.trim(), senderId: user._id },
    })
    socket?.emit('stop-typing', { workspaceId, userId: user._id })
    setText('')
    setTyping(null)
  }

  const onInput = (v) => {
    setText(v)
    if (!socket || !workspaceId || !user) return
    socket.emit('typing', { workspaceId, userId: user._id, name: user.name })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop-typing', { workspaceId, userId: user._id })
    }, 1500)
  }

  return (
    <div className="flex h-[480px] flex-col rounded-xl border border-white/10 bg-[#1a1e28]">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg._id} className="flex gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6c63ff]/30 text-xs font-medium text-[#6c63ff]">
              {(msg.sender?.name || '?').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-[#e8eaf0]">
                {msg.sender?.name || 'User'}
                <span className="ml-2 text-xs text-[#7a7f94]">
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                </span>
              </div>
              <div className="text-sm text-[#7a7f94]">{msg.text}</div>
            </div>
          </div>
        ))}
        {typing && <div className="text-xs italic text-[#7a7f94]">{typing} is typing…</div>}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-white/10 bg-[#13161d] px-4 py-2 text-[#e8eaf0]"
            placeholder="Message…"
            value={text}
            onChange={(e) => onInput(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-xl bg-[#6c63ff] px-4 py-2 text-white"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
