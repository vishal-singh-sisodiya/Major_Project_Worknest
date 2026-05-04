import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../utils/api.js'
import { toastError } from '../../utils/toast.js'

let msgKey = 0
function nextId() {
  msgKey += 1
  return `m-${msgKey}`
}

/** Convert API JSON payloads to readable plain text (before bubble cleaning). */
function formatPrioritized(ranked) {
  if (!Array.isArray(ranked) || ranked.length === 0) return 'No prioritized list returned.'
  return ranked
    .map((r, i) => {
      const title = typeof r.title === 'string' ? r.title : ''
      const reason = typeof r.reason === 'string' ? r.reason : ''
      return `${i + 1}. ${title}${reason ? `\n   ${reason}` : ''}`.trim()
    })
    .join('\n\n')
}

function formatSuggestedTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 'No task suggestions returned.'
  return tasks
    .map((t) => {
      if (typeof t === 'string') return `• ${t}`
      if (t && typeof t === 'object' && t.title) return `• ${t.title}`
      return `• ${String(t)}`
    })
    .join('\n')
}

/**
 * Strip markdown noise; use • for bullets; plain readable text for chat bubbles.
 */
function cleanAiResponse(text) {
  if (text == null || text === '') return ''
  let s = String(text)

  s = s.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_, inner) => {
    const body = (inner || '').trim()
    return body ? `${body}\n\n` : ''
  })

  for (let i = 0; i < 5 && /\*\*[^*]/.test(s); i += 1) {
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1')
  }
  s = s.replace(/__([^_]+)__/g, '$1')

  s = s.replace(/^#{1,6}\s+/gm, '')

  s = s
    .split('\n')
    .map((line) => line.replace(/^(\s*)[-*]\s+/, '$1• '))
    .join('\n')

  s = s.replace(/\*([^*\n]+)\*/g, '$1')

  s = s.replace(/\n{3,}/g, '\n\n').trim()

  const t = s.trim()
  if ((t.startsWith('[') || t.startsWith('{')) && t.length < 200000) {
    try {
      const p = JSON.parse(t)
      if (Array.isArray(p)) {
        if (p.length && typeof p[0] === 'object' && p[0] !== null && 'title' in p[0]) {
          return cleanAiResponse(formatPrioritized(p))
        }
        if (p.every((x) => typeof x === 'string')) {
          return p.map((x) => `• ${x}`).join('\n')
        }
      }
    } catch {
      /* leave s */
    }
  }

  return s.trim()
}

/** Readable chatbot-style body: paragraphs + preserved line breaks within each block */
function ChatMessageBody({ text, isUser }) {
  const blocks = text.split(/\n\n+/).filter((b) => b.trim())
  return (
    <div className={`space-y-2 ${isUser ? 'text-white/95' : 'text-[var(--wn-fg)]'}`}>
      {blocks.map((block, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap break-words text-[13px] leading-[1.55] first:mt-0"
        >
          {block}
        </p>
      ))}
    </div>
  )
}

function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex max-w-[min(92%,21rem)] gap-3"
    >
      <div className="relative shrink-0">
        <AvatarW />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--wn-panel)]" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-[color:var(--wn-border-strong)] bg-gradient-to-br from-[#1a1625] via-[var(--wn-panel)] to-[#151022] px-4 py-3 shadow-lg shadow-black/20 ring-1 ring-white/[0.06]">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#a78bfa]/90">
          WorkNest AI · typing…
        </p>
        <div className="flex items-center gap-1 py-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="ai-typing-ball h-2 w-2 rounded-full bg-[#a78bfa]" />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function AvatarW() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2d2652] to-[#1a1625] text-xs font-bold text-[#ddd6fe] shadow-md ring-1 ring-white/12"
      aria-hidden
    >
      W
    </div>
  )
}

const QUICK = {
  chat: {
    label: 'Chat',
    userMsg: 'Give me a productivity tip.',
    needsWorkspace: true,
  },
  suggest: {
    label: 'Suggest Tasks',
    userMsg: 'Suggest task ideas for my WorkNest team.',
    api: async () => {
      const { data } = await api.post('/ai/suggest-tasks', {
        projectName: 'WorkNest',
        description: 'Team tasks',
      })
      return cleanAiResponse(formatSuggestedTasks(data.tasks))
    },
    needsWorkspace: false,
  },
  summarize: {
    label: 'Summarize',
    userMsg: 'Summarize this note for me.',
    api: async () => {
      const { data } = await api.post('/ai/summarize', {
        content: 'Sample note content.',
      })
      return cleanAiResponse(data.summary || '')
    },
    needsWorkspace: false,
  },
  plan: {
    label: 'Plan day',
    userMsg: 'Plan my day using my current tasks.',
    api: async (tasks) => {
      const { data } = await api.post('/ai/plan-day', {
        tasks: tasks.map((t) => ({ title: t.title, status: t.status })),
      })
      return cleanAiResponse(data.plan || '')
    },
    needsWorkspace: false,
  },
}

export function AIPanel({ tasks = [], workspaceId: workspaceIdProp, variant = 'default' }) {
  const isDock = variant === 'dock'
  const [assistantMode, setAssistantMode] = useState('personal')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)
  const tailRef = useRef(null)
  const modeMessagesCache = useRef({ personal: [], general: [] })

  const workspaceId =
    workspaceIdProp ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('workspaceId') : '') ||
    ''

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      tailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = '0px'
    const next = Math.min(Math.max(ta.scrollHeight, 44), 140)
    ta.style.height = `${next}px`
  }, [input])

  const appendAssistantError = useCallback((errMsg) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: cleanAiResponse(errMsg) }])
    toastError(errMsg)
  }, [])

  const switchAssistantMode = useCallback(
    (next) => {
      if (next === assistantMode) return
      modeMessagesCache.current[assistantMode] = messages
      setAssistantMode(next)
      setMessages(modeMessagesCache.current[next] ?? [])
    },
    [assistantMode, messages]
  )

  const sendUserChat = async (text) => {
    const msg = text.trim()
    if (!msg || loading) return
    if (!workspaceId) {
      toastError('Select a workspace to use chat.')
      return
    }
    setLoading(true)
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: msg }])
    try {
      const { data } = await api.post('/ai/chat', { message: msg, workspaceId })
      const reply = cleanAiResponse(data.reply || '')
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: reply }])
    } catch (e) {
      const errMsg = e.response?.data?.message || e.message || 'Request failed'
      appendAssistantError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const runQuick = async (key) => {
    if (loading) return
    const cfg = QUICK[key]
    if (!cfg) return
    if (cfg.needsWorkspace && !workspaceId) {
      toastError('Select a workspace first.')
      return
    }

    const userShown = cfg.userMsg

    setLoading(true)
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: userShown }])
    try {
      let assistantText = ''
      if (key === 'chat') {
        const { data } = await api.post('/ai/chat', {
          message: userShown,
          workspaceId,
        })
        assistantText = cleanAiResponse(data.reply || '')
      } else if (typeof cfg.api === 'function') {
        assistantText = await cfg.api(tasks)
      }
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: assistantText }])
    } catch (e) {
      const errMsg = e.response?.data?.message || e.message || 'Request failed'
      appendAssistantError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    sendUserChat(msg)
  }

  const onComposerKeyDown = (e) => {
    if (e.key !== 'Enter') return
    if (e.shiftKey) return
    e.preventDefault()
    handleSubmit(e)
  }

  const shellClass = isDock
    ? 'flex h-full min-h-0 flex-1 flex-col p-4'
    : 'gradient-border-wrap flex min-h-[400px] flex-col'
  const innerClass = isDock
    ? 'flex min-h-0 flex-1 flex-col'
    : 'gradient-border-inner flex min-h-[398px] flex-1 flex-col rounded-[15px] p-4'

  return (
    <div className={shellClass}>
      <div className={innerClass}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-[var(--wn-fg)]">{isDock ? 'WorkNest AI' : 'AI Assistant'}</h3>
            {!isDock && (
              <span className="mt-1 inline-block rounded-full border border-[#6c63ff]/35 bg-[#6c63ff]/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#a78bfa]">
                WorkNest · Groq
              </span>
            )}
          </div>
        </div>

        {isDock && (
          <div className="mb-3 flex rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] p-1">
            {[
              ['personal', 'Personal Assistant'],
              ['general', 'General Chat'],
            ].map(([key, label]) => {
              const active = assistantMode === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={loading}
                  onClick={() => switchAssistantMode(key)}
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-[11px] font-bold transition disabled:opacity-45 ${
                    active ? 'bg-[#6c63ff] text-white shadow-md' : 'text-[var(--wn-muted)] hover:text-[var(--wn-fg)]'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {(!isDock || assistantMode === 'personal') && (
          <div className="mb-2 flex flex-wrap gap-2 border-b border-[color:var(--wn-border)] pb-3">
            {[
              ['chat', QUICK.chat.label],
              ['suggest', QUICK.suggest.label],
              ['summarize', QUICK.summarize.label],
              ['plan', QUICK.plan.label],
            ].map(([key, label]) => (
              <motion.button
                key={key}
                type="button"
                disabled={loading || (key === 'chat' && !workspaceId)}
                onClick={() => runQuick(key)}
                className="wn-btn rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] px-3 py-2 text-[11px] font-semibold text-[var(--wn-fg)] disabled:opacity-45"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {label}
              </motion.button>
            ))}
          </div>
        )}

        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className={`ai-chat-thread scrollbar-thin flex-1 space-y-4 overflow-y-auto rounded-2xl border border-[color:var(--wn-border)] bg-[var(--wn-bg)]/40 px-3 py-4 backdrop-blur-sm ${isDock ? 'min-h-[200px]' : 'min-h-[220px]'}`}
        >
          {messages.length === 0 && !loading && assistantMode === 'general' && isDock && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3 px-3 py-6"
            >
              <div className="flex gap-2.5">
                <AvatarW />
                <div className="min-w-0 rounded-2xl rounded-tl-md border border-[color:var(--wn-border-strong)] bg-gradient-to-b from-[var(--wn-panel)] to-[color-mix(in_srgb,var(--wn-panel)_88%,black)] px-[14px] py-3 shadow-md">
                  <p className="text-[13px] leading-relaxed text-[var(--wn-fg)]">
                    Hello! I&apos;m WorkNest AI, your personal productivity assistant. How can I help you today?
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {messages.length === 0 && !loading && !(isDock && assistantMode === 'general') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center"
            >
              <div className="rounded-2xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)]/80 px-4 py-3 text-sm text-[var(--wn-muted)]">
                {isDock && assistantMode === 'personal'
                  ? 'Use shortcuts above or type below. I can use your workspace tasks when relevant.'
                  : 'Start a conversation — type below or tap a shortcut. Messages read like a normal chatbot thread.'}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) =>
              m.role === 'assistant' ? (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex w-full gap-2.5 justify-start"
                >
                  <AvatarW />
                  <div className="group min-w-0 max-w-[min(92%,22rem)]">
                    <span className="mb-1 ml-1 block text-[10px] font-medium text-[var(--wn-muted)]">
                      WorkNest AI
                    </span>
                    <div className="rounded-2xl rounded-tl-md border border-[color:var(--wn-border-strong)] bg-gradient-to-b from-[var(--wn-panel)] to-[color-mix(in_srgb,var(--wn-panel)_88%,black)] px-[14px] py-3 shadow-md shadow-black/10 ring-1 ring-white/[0.05]">
                      <ChatMessageBody text={m.text} isUser={false} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex w-full gap-2 justify-end"
                >
                  <div className="min-w-0 max-w-[min(92%,22rem)]">
                    <span className="mb-1 mr-1 block text-right text-[10px] font-medium text-[var(--wn-muted)]">
                      You
                    </span>
                    <div className="rounded-2xl rounded-tr-md bg-gradient-to-br from-[#6c63ff] via-[#7c6bf0] to-[#8b5cf6] px-[14px] py-3 text-white shadow-lg shadow-[#6c63ff]/25 ring-1 ring-white/15">
                      <ChatMessageBody text={m.text} isUser />
                    </div>
                  </div>
                  <span className="w-9 shrink-0" aria-hidden />
                </motion.div>
              )
            )}
          </AnimatePresence>

          {loading && <TypingBubble />}

          <div ref={tailRef} className="h-px shrink-0" aria-hidden />
        </div>

        <form onSubmit={handleSubmit} className="mt-3">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--wn-border-strong)] bg-[var(--wn-panel)] shadow-inner ring-1 ring-white/[0.04] transition-[box-shadow] focus-within:border-[#6c63ff]/45 focus-within:ring-2 focus-within:ring-[#6c63ff]/18">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder={
                isDock && assistantMode === 'general'
                  ? 'Message WorkNest AI…'
                  : 'Ask anything… Shift+Enter for a new line, Enter to send.'
              }
              disabled={loading}
              aria-label="Message to AI"
              className="ai-composer-field max-h-[140px] min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-[13px] leading-relaxed text-[var(--wn-fg)] placeholder:text-[var(--wn-muted)] focus:outline-none disabled:opacity-50"
              autoComplete="off"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--wn-border)]/80 px-3 py-2">
              <span className="hidden text-[10px] text-[var(--wn-muted)] sm:inline">
                Enter to send · Shift+Enter new line
              </span>
              <span className="text-[10px] text-[var(--wn-muted)] sm:hidden">
                Enter sends · ⇧Enter newline
              </span>
              <motion.button
                type="submit"
                disabled={loading || !input.trim() || !workspaceId}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#6c63ff]/25 disabled:cursor-not-allowed disabled:opacity-40"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                Send
                <kbd className="hidden rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-normal sm:inline">
                  ↵
                </kbd>
              </motion.button>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes ai-chat-dot {
          0%, 70%, 100% { transform: translateY(0); opacity: 0.38; }
          35% { transform: translateY(-4px); opacity: 1; }
        }
        .ai-typing-ball:nth-child(1) { animation: ai-chat-dot 1s ease-in-out infinite; }
        .ai-typing-ball:nth-child(2) { animation: ai-chat-dot 1s ease-in-out 0.15s infinite; }
        .ai-typing-ball:nth-child(3) { animation: ai-chat-dot 1s ease-in-out 0.3s infinite; }
        .ai-chat-thread::-webkit-scrollbar { width: 6px; }
        .ai-chat-thread::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: color-mix(in srgb, var(--wn-muted) 45%, transparent);
        }
      `}</style>
    </div>
  )
}
