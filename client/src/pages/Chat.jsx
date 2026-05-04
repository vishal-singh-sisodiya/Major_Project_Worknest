import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../context/SocketContext.jsx'
import api from '../utils/api.js'
import { toastError, toastSuccess } from '../utils/toast.js'

const BG_LEFT = '#0d0f14'
const BG_MAIN = '#13161d'
const ACCENT = '#6c63ff'
const ONLINE = '#43e97b'
const OFFLINE = '#7a7f94'
const MAX_FILE_BYTES = 12 * 1024 * 1024

const FALLBACK_CHANNELS = [
  { slug: 'general', name: 'general' },
  { slug: 'announcements', name: 'announcements' },
]

function workspaceId() {
  return localStorage.getItem('workspaceId')
}

function channelRoomId(wid, slug) {
  return `channel_${wid}_${slug}`
}

function dmRoomId(wid, userA, userB) {
  const [a, b] = [String(userA), String(userB)].sort()
  return `dm_${wid}_${a}_${b}`
}

function avatarColor(name) {
  const colors = ['#6c63ff', '#ff6584', '#43e97b', '#f7971e', '#38b2f7']
  const c = typeof name === 'string' && name.length ? name.charCodeAt(0) : 0
  return colors[Math.abs(c) % colors.length]
}

function PersonSilhouette({ className, style }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  )
}

/** Letter avatar — no remote images */
function Avatar({
  user,
  size = 36,
  showStatus = null,
  variant = 'sidebar',
}) {
  const n = size
  const displayName = (user?.name && String(user.name).trim()) || '?'
  const letter = displayName.charAt(0).toUpperCase()
  const fontSize = Math.max(12, Math.round((n / 40) * 16))

  const ringOff =
    variant === 'messages' ? 'ring-offset-[#13161d]' : 'ring-offset-[#0d0f14]'

  return (
    <div
      className={`relative shrink-0 ring-2 ring-white/[0.14] ring-offset-[3px] ${ringOff}`}
      style={{ width: n, height: n, flexShrink: 0, borderRadius: '50%' }}
    >
      <div
        style={{
          width: n,
          height: n,
          borderRadius: '50%',
          background: avatarColor(displayName),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {letter}
      </div>
      {showStatus === 'online' && (
        <span
          className={`absolute bottom-0 right-0 z-[2] box-content h-[11px] w-[11px] rounded-full border-[2.5px] ${variant === 'messages' ? 'border-[#13161d]' : 'border-[#0d0f14]'}`}
          style={{ background: ONLINE }}
          title="Online"
        />
      )}
      {showStatus === 'offline' && (
        <span
          className={`absolute bottom-0 right-0 z-[2] box-content h-[11px] w-[11px] rounded-full border-[2.5px] ${variant === 'messages' ? 'border-[#13161d]' : 'border-[#0d0f14]'}`}
          style={{ background: OFFLINE }}
          title="Offline"
        />
      )}
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Group consecutive same-sender messages within 6 minutes */
function groupedRows(messages) {
  const out = []
  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i]
    const sid = msg.sender?._id || msg.sender
    const prev = messages[i - 1]
    let group = false
    if (prev) {
      const ps = prev.sender?._id || prev.sender
      if (ps && sid && String(ps) === String(sid)) {
        const ta = new Date(msg.createdAt || 0).getTime()
        const tb = new Date(prev.createdAt || 0).getTime()
        if (ta - tb < 6 * 60 * 1000) group = true
      }
    }
    out.push({ msg, group })
  }
  return out
}

export default function Chat() {
  const wid = workspaceId()
  const { user } = useAuth()
  const { socket, onlineUsers, joinWorkspace } = useSocket()

  const [workspace, setWorkspace] = useState(null)
  const [channels, setChannels] = useState(FALLBACK_CHANNELS)
  const [selectedKey, setSelectedKey] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [typing, setTyping] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')

  const selection = useMemo(
    () => (selectedKey ? parseSelectionKey(selectedKey) : null),
    [selectedKey]
  )
  const memberList = useMemo(() => normalizeMembers(workspace, user), [workspace, user])

  const bottomRef = useRef(null)
  const typingTimer = useRef(null)
  const prevRoomRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const onlineSet = useMemo(() => {
    const s = new Set()
    for (const u of onlineUsers || []) {
      if (u?.userId) s.add(String(u.userId))
    }
    return s
  }, [onlineUsers])

  useEffect(() => {
    joinWorkspace?.(wid)
  }, [wid, joinWorkspace])

  const loadWorkspace = useCallback(async () => {
    if (!wid) return
    try {
      const { data } = await api.get(`/workspaces/${wid}`)
      setWorkspace(data)
      const ch = Array.isArray(data.chatChannels) && data.chatChannels.length ? data.chatChannels : FALLBACK_CHANNELS
      setChannels(ch)
      setSelectedKey((k) => {
        if (k) return k
        return `channel:${ch[0]?.slug || 'general'}`
      })
    } catch {
      toastError('Could not load workspace')
      setWorkspace(null)
    }
  }, [wid])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  const selectionRoom = useMemo(() => {
    if (!wid || !selection) return null
    if (selection.type === 'channel') {
      const ch = channels.find((c) => c.slug === selection.slug)
      const name = ch?.name || selection.slug
      return { roomId: channelRoomId(wid, selection.slug), title: `# ${name}` }
    }
    const peer = memberList.find((m) => String(m._id) === String(selection.peerId))
    return {
      roomId: dmRoomId(wid, user?._id, selection.peerId),
      title: peer?.name || 'Direct message',
      peerId: selection.peerId,
    }
  }, [wid, selection, user?._id, channels, memberList])

  /** Load history + join socket room */
  useEffect(() => {
    const roomId = selectionRoom?.roomId
    if (!wid || !roomId || !user) return

    if (prevRoomRef.current && socket && prevRoomRef.current !== roomId) {
      socket.emit('leave-room', prevRoomRef.current)
    }
    prevRoomRef.current = roomId

    socket?.emit('join-room', roomId)
    api
      .get(`/messages/${encodeURIComponent(roomId)}`)
      .then(({ data }) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]))
  }, [wid, selectionRoom?.roomId, user, socket])

  useEffect(() => {
    setAttachment(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [selectionRoom?.roomId])

  useEffect(() => {
    if (!socket || !selectionRoom?.roomId) return
    const roomId = selectionRoom.roomId

    const onMsg = ({ message: m }) => {
      if (!m || m.roomId !== roomId) return
      setMessages((prev) => {
        if (prev.some((x) => x._id === m._id)) return prev
        return [...prev, m]
      })
    }
    const onTyping = ({ userId, name: n, roomId: r }) => {
      if (!r || r !== roomId) return
      if (String(userId) === String(user?._id)) return
      setTyping(n || 'Someone')
    }
    const onStop = ({ userId, roomId: r }) => {
      if (!r || r !== roomId) return
      if (String(userId) === String(user?._id)) return
      setTyping(null)
    }

    socket.on('new-message', onMsg)
    socket.on('user-typing', onTyping)
    socket.on('stop-typing', onStop)
    return () => {
      socket.off('new-message', onMsg)
      socket.off('user-typing', onTyping)
      socket.off('stop-typing', onStop)
    }
  }, [socket, selectionRoom?.roomId, user?._id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = '0'
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 40), 120)}px`
  }, [draft])

  const broadcastTyping = useCallback(() => {
    const roomId = selectionRoom?.roomId
    if (!socket || !roomId || !user) return
    socket.emit('typing', {
      roomId,
      userId: user._id,
      name: user.name,
    })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.emit('stop-typing', { roomId, userId: user._id })
    }, 1500)
  }, [socket, selectionRoom?.roomId, user])

  const handleFileAttach = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      toastError('File too large (max 12 MB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: reader.result,
      })
    }
    reader.readAsDataURL(file)
  }

  const send = () => {
    const text = draft.trim()
    const roomId = selectionRoom?.roomId
    const hasAtt = attachment && attachment.data
    if ((!text && !hasAtt) || !socket || !roomId || !user || !wid) return
    socket.emit('stop-typing', { roomId, userId: user._id })
    socket.emit('send-message', {
      roomId,
      message: {
        text: text || (hasAtt ? `Attachment: ${attachment.name}` : ''),
        senderId: user._id,
        ...(hasAtt
          ? {
              attachment: {
                name: attachment.name,
                type: attachment.type,
                data: attachment.data,
              },
            }
          : {}),
      },
    })
    setDraft('')
    setAttachment(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTyping(null)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    send()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const submitNewChannel = async (e) => {
    e.preventDefault()
    if (!wid || !newChannelName.trim()) return
    try {
      const { data } = await api.post(`/workspaces/${wid}/channels`, {
        name: newChannelName.trim(),
      })
      toastSuccess(`Channel ${newChannelName.trim()} added`)
      setNewChannelName('')
      setCreateOpen(false)
      if (Array.isArray(data.chatChannels) && data.chatChannels.length) {
        setChannels(data.chatChannels)
        const last = data.chatChannels[data.chatChannels.length - 1]
        setSelectedKey(`channel:${last.slug}`)
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Could not create channel')
    }
  }

  if (!wid) {
    return (
      <p className="text-[var(--wn-muted)]" style={{ fontFamily: '"DM Sans", sans-serif' }}>
        Select a workspace from Team.
      </p>
    )
  }

  return (
    <div
      className="-mx-2 flex max-h-[calc(100vh-7rem)] min-h-[520px] gap-0 overflow-hidden rounded-xl border border-[color:var(--wn-border)] sm:-mx-0"
      style={{ fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif', background: BG_MAIN }}
    >
      {/* Left */}
      <aside
        className="flex w-full max-w-[280px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06]"
        style={{ background: BG_LEFT }}
      >
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h1 className="text-sm font-bold uppercase tracking-wider text-white/50">Chat</h1>
          <p className="mt-0.5 truncate text-xs text-white/45">{workspace?.name || 'Loading…'}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-white/35">Channels</p>
          <nav className="space-y-0.5">
            {channels.map((ch) => {
              const key = `channel:${ch.slug}`
              const active = selectedKey === key
              return (
                <motion.button
                  key={ch.slug}
                  type="button"
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedKey(key)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition"
                  style={{
                    background: active ? `${ACCENT}22` : 'transparent',
                    borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                    color: active ? '#f4f4f5' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  <span className="font-semibold text-white/85">#</span>
                  <span>{ch.name}</span>
                </motion.button>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={workspace?.myRole !== 'admin'}
            className="mx-2 mt-2 w-[calc(100%-1rem)] rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35"
            style={{
              color: ACCENT,
              background: 'rgba(108,99,255,0.08)',
            }}
            title={workspace?.myRole !== 'admin' ? 'Admins only' : 'Create channel'}
          >
            + Create new channel
          </button>

          <div className="mb-2 mt-6 flex items-center gap-2 px-2">
            <PersonSilhouette className="h-3.5 w-3.5 shrink-0 text-white/35" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
              Direct messages
            </p>
          </div>
          <nav className="space-y-1 px-1">
            {memberList.length === 0 && (
              <p className="px-3 py-4 text-center text-[11px] leading-relaxed text-white/30">
                No other members in this workspace yet. Invite teammates from Team.
              </p>
            )}
            {memberList.map((m) => {
              const key = `dm:${m._id}`
              const active = selectedKey === key
              const on = onlineSet.has(String(m._id))
              return (
                <motion.button
                  key={m._id}
                  type="button"
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedKey(key)}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-white/[0.04]"
                  style={{
                    background: active ? `${ACCENT}26` : 'transparent',
                    boxShadow: active ? `inset 4px 0 0 ${ACCENT}` : 'none',
                  }}
                >
                  <Avatar
                    user={m}
                    size={34}
                    showStatus={on ? 'online' : 'offline'}
                    variant="sidebar"
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${
                      active ? 'text-white' : 'text-white/72'
                    }`}
                  >
                    {m.name}
                  </span>
                </motion.button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <section className="flex min-w-0 flex-1 flex-col" style={{ background: BG_MAIN }}>
        <header className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
          {selection?.type === 'dm' && selectionRoom?.peerId ? (
            <Avatar
              user={memberList.find((x) => String(x._id) === String(selectionRoom.peerId))}
              size={40}
              showStatus={onlineSet.has(String(selectionRoom.peerId)) ? 'online' : 'offline'}
              variant="messages"
            />
          ) : selection?.type === 'channel' ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6c63ff]/22 text-[#c4b5fd] ring-1 ring-[#6c63ff]/30">
              <span className="font-display text-lg font-bold leading-none">#</span>
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-[#eef0f4]">{selectionRoom?.title ?? '—'}</h2>
            <p className="text-[11px]" style={{ color: OFFLINE }}>
              {selection?.type === 'dm'
                ? 'Direct message · only you two'
                : 'Workspace channel · real-time'}
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            <AnimatePresence initial={false}>
              {groupedRows(messages).map(({ msg: m, group }) => {
                const mine = String(m.sender?._id || m.sender) === String(user?._id)
                return (
                  <motion.div
                    key={m._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`shrink-0 ${group ? 'invisible size-[38px]' : ''}`}>
                      {!group && (
                        <Avatar user={mine ? user : m.sender} size={38} variant="messages" />
                      )}
                    </div>
                    <div
                      className={`max-w-[min(100%,32rem)] rounded-2xl border px-[14px] py-2 backdrop-blur-md ${
                        group ? 'py-1.5' : 'py-2.5'
                      }`}
                      style={{
                        borderColor: mine ? `${ACCENT}55` : 'rgba(255,255,255,0.06)',
                        background: mine ? `${ACCENT}18` : 'rgba(255,255,255,0.045)',
                      }}
                    >
                      {!group && (
                        <div
                          className={`mb-1 flex flex-wrap items-baseline gap-2 ${mine ? 'flex-row-reverse' : ''}`}
                        >
                          <span className="text-[13px] font-semibold text-[#e8eaef]">
                            {mine ? 'You' : m.sender?.name || 'Member'}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide" style={{ color: OFFLINE }}>
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                      )}
                      <p className={`whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#c9cdd6] ${group && mine ? 'text-right' : ''}`}>{m.text}</p>
                      {m.attachment?.data && (
                        <div className={`mt-2 ${mine ? 'text-right' : ''}`}>
                          {m.attachment.type?.startsWith('image/') ? (
                            <img
                              src={m.attachment.data}
                              alt=""
                              style={{ maxWidth: 200, borderRadius: 8, marginTop: 6 }}
                            />
                          ) : (
                            <a
                              href={m.attachment.data}
                              download={m.attachment.name}
                              className="inline-block text-[13px] font-medium"
                              style={{ color: ACCENT }}
                            >
                              {m.attachment.name}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {typing && (
              <div className="flex items-center gap-2 pl-[52px] text-[11px]" style={{ color: OFFLINE }}>
                <span className="font-medium text-[#a78bfa]">{typing}</span>
                <span className="flex gap-1 py-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-[#a78bfa]"
                      style={{ opacity: 0.7 }}
                    />
                  ))}
                </span>
              </div>
            )}
            <div ref={bottomRef} className="h-2" />
          </div>

          <form onSubmit={onSubmit} className="border-t border-white/[0.06] p-4">
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/24 backdrop-blur-sm">
              {attachment && (
                <div
                  style={{
                    padding: '8px 16px',
                    background: '#1a1e28',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {attachment.type.startsWith('image/') ? (
                    <img src={attachment.data} alt="" style={{ height: 60, borderRadius: 8 }} />
                  ) : (
                    <span className="truncate text-[13px] text-[#c9cdd6]">{attachment.name}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    style={{
                      color: '#ff6584',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      marginLeft: 'auto',
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  broadcastTyping()
                }}
                onKeyDown={onKeyDown}
                placeholder={`Message ${selectionRoom?.title || ''}…`}
                disabled={!selectionRoom?.roomId}
                className="max-h-[120px] min-h-[40px] w-full resize-none bg-transparent px-3 py-3 text-[13px] leading-relaxed text-[#e4e7ec] outline-none placeholder:text-white/35 disabled:opacity-50"
              />
              <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] px-3 py-2">
                <span className="hidden text-[10px] text-white/35 sm:inline">
                  Enter to send · Shift+Enter new line
                </span>
                <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
                  <label
                    style={{ cursor: 'pointer', color: '#7a7f94', padding: '0 10px' }}
                    className="flex shrink-0 items-center text-[11px] font-semibold uppercase tracking-wide leading-none hover:text-white/70"
                  >
                    File
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileAttach}
                    />
                  </label>
                  <motion.button
                    type="submit"
                    disabled={!(draft.trim() || attachment) || !selectionRoom?.roomId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-lg px-5 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    style={{ background: `linear-gradient(90deg, ${ACCENT}, #8b5cf6)` }}
                  >
                    Send
                  </motion.button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setCreateOpen(false)}
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-xl border border-white/[0.1] p-5 shadow-2xl"
            style={{ background: BG_LEFT }}
            onSubmit={submitNewChannel}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Create channel</h3>
            <p className="mt-1 text-xs text-white/45">Adds a workspace channel visible to members.</p>
            <input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="engineering"
              className="mt-4 w-full rounded-lg border border-white/[0.1] bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-[#6c63ff]/50"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg px-5 py-2 text-xs font-semibold text-white"
                style={{ background: ACCENT }}
              >
                Create
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  )
}

function parseSelectionKey(key) {
  if (!key) return null
  if (key.startsWith('channel:')) {
    const slug = key.slice(8)
    return { type: 'channel', slug }
  }
  if (key.startsWith('dm:')) {
    const peerId = key.slice(3)
    return { type: 'dm', peerId }
  }
  return null
}

function normalizeMembers(workspace, currentUser) {
  if (!workspace) return []
  const cid = currentUser?._id ? String(currentUser._id) : ''
  const map = new Map()

  const add = (u) => {
    if (!u?._id) return
    const id = String(u._id)
    if (id === cid) return
    if (!map.has(id)) map.set(id, { _id: u._id, name: u.name, email: u.email, avatar: u.avatar })
  }

  for (const m of workspace.members || []) {
    if (m?.user && typeof m.user === 'object') add(m.user)
  }
  if (workspace.owner && typeof workspace.owner === 'object') add(workspace.owner)
  return [...map.values()]
}
