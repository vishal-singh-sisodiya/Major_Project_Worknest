import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSocket } from '../../context/SocketContext.jsx'
import api from '../../utils/api.js'
import { toastSuccess } from '../../utils/toast.js'

function TypingBubble() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[color:var(--wn-border)] bg-[var(--wn-deep-a90)] px-4 py-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot h-2 w-2 rounded-full bg-[#6c63ff]" />
      ))}
    </div>
  )
}

export function ChatBox({ workspaceId, channelTitle = '# general' }) {
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
  }, [messages, typing])

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
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] shadow-xl lg:min-h-[560px] min-h-[480px]">
      <div className="border-b border-[color:var(--wn-border)] px-5 py-4">
        <motion.h2 layout className="font-display text-lg font-bold text-[var(--wn-fg)]">
          {channelTitle}
        </motion.h2>
        <p className="text-[11px] text-[var(--wn-muted)]">Workspace-wide channel · realtime</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => (
          <motion.div
            key={msg._id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6c63ff] to-[#4338ca] text-[11px] font-bold text-white">
              {(msg.sender?.name || '?').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border border-[color:var(--wn-border)] bg-[var(--wn-deep-a70)] px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-sm font-bold text-[var(--wn-fg)]">{msg.sender?.name || 'User'}</span>
                <span className="text-[10px] uppercase tracking-wide text-[var(--wn-muted)]">
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--wn-muted)]">{msg.text}</p>
            </div>
          </motion.div>
        ))}
        {typing && (
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-[var(--wn-muted)]">{typing}</div>
            <TypingBubble />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="border-t border-[color:var(--wn-border)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-3 py-2 text-xs font-bold text-[var(--wn-muted)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toastSuccess('Attachments soon')}
          >
            Attach
          </motion.button>
          <input
            className="min-w-0 flex-1 rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-sm text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
            placeholder="Write a message…"
            value={text}
            onChange={(e) => onInput(e.target.value)}
          />
          <motion.button
            type="submit"
            disabled={!text.trim()}
            whileHover={{ scale: 1.03, boxShadow: '0 0 22px rgba(108,99,255,0.35)' }}
            whileTap={{ scale: 0.96 }}
            className="rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-6 py-3 font-display font-bold text-white disabled:opacity-40"
          >
            Send
          </motion.button>
        </div>
      </form>
    </div>
  )
}
