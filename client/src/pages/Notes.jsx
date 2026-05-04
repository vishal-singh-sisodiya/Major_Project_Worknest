import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../utils/api.js'

function wid() {
  return localStorage.getItem('workspaceId')
}

const TABS = ['All', 'Work', 'Personal', 'Ideas']

const PRESET_LOOKUP = [
  { match: /project\s*ideas/i, tint: 'from-violet-500/15 to-[#6c63ff]/10 border-violet-400/25' },
  { match: /meeting/i, tint: 'from-blue-500/15 to-blue-600/10 border-blue-400/25' },
  { match: /daily\s*code|code/i, tint: 'from-emerald-500/15 to-emerald-700/10 border-emerald-400/25' },
  { match: /research/i, tint: 'from-amber-500/15 to-orange-600/10 border-orange-400/25' },
  { match: /design\s*system/i, tint: 'from-fuchsia-500/15 to-pink-600/10 border-pink-400/25' },
  { match: /feedback/i, tint: 'from-rose-500/15 to-rose-700/10 border-rose-400/25' },
  { match: /to[- ]?do/i, tint: 'from-cyan-500/15 to-sky-600/10 border-cyan-400/25' },
  { match: /important/i, tint: 'from-yellow-500/15 to-yellow-700/15 border-yellow-400/35' },
]

function tintFor(note) {
  const t = `${note.title} ${note.content || ''}`
  for (const p of PRESET_LOOKUP) if (p.match.test(t)) return p
  return {
    tint: 'from-[#6c63ff]/12 to-transparent border-[color:var(--wn-border-strong)]',
  }
}

export default function Notes() {
  const workspace = wid()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tab, setTab] = useState('All')
  const [query, setQuery] = useState('')

  const load = async () => {
    if (!workspace) return
    setLoading(true)
    try {
      const { data } = await api.get(`/notes/${workspace}`)
      setNotes(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [workspace])

  const filtered = useMemo(() => {
    let list = [...notes]
    const q = query.trim().toLowerCase()
    if (q)
      list = list.filter((n) => {
        const blob = `${n.title} ${n.content || ''} ${(n.tags || []).join(' ')}`.toLowerCase()
        return blob.includes(q)
      })
    if (tab !== 'All') {
      const t = tab.toLowerCase()
      list = list.filter((n) => (n.tags || []).some((tag) => tag.toLowerCase() === t))
    }
    return list
  }, [notes, tab, query])

  const openNew = () => {
    setSelected(null)
    setTitle('')
    setContent('')
    setEditorOpen(true)
  }

  const openEdit = (n) => {
    setSelected(n)
    setTitle(n.title || '')
    setContent(n.content || '')
    setEditorOpen(true)
  }

  const save = async () => {
    if (!workspace) return
    const tagExtra = []
    if (tab !== 'All' && !selected) tagExtra.push(tab.toLowerCase())
    if (selected) {
      await api.put(`/notes/${selected._id}`, {
        workspaceId: workspace,
        title,
        content,
      })
    } else {
      await api.post('/notes', {
        workspaceId: workspace,
        title,
        content,
        tags: tagExtra.length ? tagExtra : undefined,
      })
    }
    setEditorOpen(false)
    load()
  }

  if (!workspace) {
    return <p className="text-[var(--wn-muted)]">Select a workspace from Team.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">Notes</h1>
          <p className="mt-1 text-sm text-[var(--wn-muted)]">All your notes in one place</p>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(108,99,255,0.4)' }}
          whileTap={{ scale: 0.98 }}
          onClick={openNew}
          className="wn-btn rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-6 py-3 font-display font-bold text-white"
        >
          + New Note
        </motion.button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xl flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-[var(--wn-muted)]">
            Search
          </span>
          <input
            className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] py-2.5 pl-[4.5rem] pr-4 text-sm text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/25"
            placeholder="Search notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] p-1">
          {TABS.map((t) => (
            <motion.button
              key={t}
              type="button"
              whileHover={{ scale: 1.02 }}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${
                tab === t ? 'bg-[#6c63ff] text-white' : 'text-[var(--wn-muted)]'
              }`}
            >
              {t}
            </motion.button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton mb-4 break-inside-avoid h-40 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {filtered.map((n, i) => {
            const preset = tintFor(n)
            const plain = (n.content || '').replace(/<[^>]+>/g, '').trim()
            const snippet =
              plain.length > 140 ? `${plain.slice(0, 140)}…` : plain || 'Tap to capture more ideas…'

            return (
              <motion.button
                key={n._id}
                type="button"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.35) }}
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => openEdit(n)}
                className={`break-inside-avoid w-full rounded-xl border bg-gradient-to-br p-5 text-left shadow-lg ${preset.tint}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#6c63ff]/25 font-display text-sm font-bold text-[#a78bfa]"
                    aria-hidden
                  >
                    {(n.title || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--wn-muted)]">
                    {(n.updatedAt && new Date(n.updatedAt).toLocaleDateString()) ||
                      new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 font-display text-lg font-bold text-[var(--wn-fg)]">{n.title || 'Untitled'}</div>
                <div className="mt-2 line-clamp-4 text-sm leading-relaxed text-[var(--wn-muted)]">{snippet}</div>
              </motion.button>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {editorOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="wn-card max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display mb-4 text-xl font-bold text-[var(--wn-fg)]">
                {selected ? 'Edit note' : 'New note'}
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="min-h-[200px] w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                  placeholder="Content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              {!selected && (
                <p className="mt-3 text-xs text-[var(--wn-muted)]">
                  Saving from tab <strong className="text-[var(--wn-fg)]">{tab}</strong> tags this note accordingly.
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl border border-[color:var(--wn-border-strong)] px-5 py-2.5 font-semibold text-[var(--wn-fg)]"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(108,99,255,0.35)' }}
                  onClick={save}
                  className="rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-6 py-2.5 font-bold text-white"
                >
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
