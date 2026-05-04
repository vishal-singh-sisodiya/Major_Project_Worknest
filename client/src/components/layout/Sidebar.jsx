import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import api from '../../utils/api.js'
import { toastSuccess, toastError } from '../../utils/toast.js'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/notes', label: 'Notes' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/team', label: 'Team' },
  { to: '/chat', label: 'Chat' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, ease: [0.175, 0.885, 0.32, 1.275] },
  },
}

export function Sidebar({ open, onNavigate, activeWorkspaceId, onWorkspaceActivate }) {
  const { user, refreshUser } = useAuth()
  const initials = (user?.name || 'U').slice(0, 2).toUpperCase()

  const [workspaces, setWorkspaces] = useState([])
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)

  const loadWorkspaces = useCallback(async () => {
    try {
      const { data } = await api.get('/workspaces/my')
      setWorkspaces(Array.isArray(data) ? data : [])
    } catch {
      setWorkspaces([])
    }
  }, [])

  useEffect(() => {
    loadWorkspaces()
  }, [activeWorkspaceId, loadWorkspaces])

  const switchWorkspace = (ws) => {
    if (!ws?._id) return
    onWorkspaceActivate?.(ws)
    onNavigate?.()
  }

  const submitNewWorkspace = async (e) => {
    e.preventDefault()
    const name = newWorkspaceName.trim()
    if (!name) {
      toastError('Enter a workspace name')
      return
    }
    setCreating(true)
    try {
      const { data } = await api.post('/workspaces', { name })
      await refreshUser?.()
      onWorkspaceActivate?.(data)
      await loadWorkspaces()
      toastSuccess(`Workspace "${data?.name || name}" created`)
      setNewWorkspaceName('')
      setWorkspaceModalOpen(false)
      onNavigate?.()
    } catch (err) {
      toastError(err.response?.data?.message || 'Could not create workspace')
    } finally {
      setCreating(false)
    }
  }

  const modal = createPortal(
    <AnimatePresence>
      {workspaceModalOpen && (
        <motion.div
          className="fixed inset-0 z-[320] flex items-center justify-center p-4 font-[family-name:var(--font-body)]"
          style={{ fontFamily: '"DM Sans", var(--font-body), sans-serif' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            aria-label="Close"
            onClick={() => !creating && setWorkspaceModalOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-ws-heading"
            className="relative z-[321] w-full max-w-[400px] overflow-hidden rounded-[20px] border border-[#6c63ff]/25 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            style={{
              background: 'rgba(19, 22, 29, 0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(108,99,255,0.12)',
            }}
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div
              className="border-b border-white/[0.06] px-6 py-5"
              style={{ background: 'rgba(108,99,255,0.06)' }}
            >
              <h2 id="new-ws-heading" className="text-lg font-bold tracking-tight text-[#eef0f7]">
                New workspace
              </h2>
              <p className="mt-1 text-sm text-[#9aa3b8]">
                Choose a display name — you’ll be workspace admin automatically.
              </p>
            </div>
            <form onSubmit={submitNewWorkspace} className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8891a8]">Name</span>
                <input
                  autoFocus
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Acme Squad"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3.5 text-[#f4f6fc] outline-none ring-0 transition placeholder:text-[#5c6578] focus:border-[#6c63ff]/50 focus:ring-2 focus:ring-[#6c63ff]/25"
                  disabled={creating}
                />
              </label>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setWorkspaceModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-semibold text-[#c9ced9] hover:bg-white/[0.05] disabled:opacity-45"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-xl bg-[#6c63ff] py-3 text-sm font-bold text-white shadow-[0_4px_24px_rgba(108,99,255,0.35)] disabled:opacity-50"
                  whileHover={{ scale: creating ? 1 : 1.02 }}
                  whileTap={{ scale: creating ? 1 : 0.98 }}
                >
                  {creating ? 'Creating…' : 'Create workspace'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )

  return (
    <aside
      className={`wn-sidebar fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col border-r border-[color:var(--wn-border)] transition-transform duration-300 ease-out lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ background: 'var(--wn-sidebar)', fontFamily: 'var(--font-body)' }}
      aria-label="Main navigation"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-[color:var(--wn-border)] px-4 py-5">
        <motion.div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#8b5cf6] font-display text-lg font-extrabold text-white shadow-[0_0_24px_rgba(108,99,255,0.45)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          W
        </motion.div>
        <div className="min-w-0">
          <div className="font-display text-lg font-bold tracking-tight text-[var(--wn-fg)]">WorkNest</div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--wn-muted)]">Workspace</div>
        </div>
      </div>

      <motion.nav
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {links.map(({ to, label, end }) => (
          <motion.div key={to} variants={item}>
            <NavLink
              to={to}
              end={end}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                `relative block rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ` +
                (isActive
                  ? 'border border-[#6c63ff]/35 bg-[#6c63ff]/20 text-[var(--wn-fg)] shadow-[inset_3px_0_0_#6c63ff]'
                  : 'border border-transparent text-[var(--wn-muted)] hover:border-[color:var(--wn-border)] hover:bg-[var(--wn-hover)] hover:text-[var(--wn-fg)] hover:-translate-y-[1px]')
              }
            >
              {label}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      {/* Workspaces */}
      <div className="shrink-0 space-y-2 border-t border-[color:var(--wn-border)] px-3 py-3 font-[family-name:var(--font-body)]">
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--wn-muted)]">Workspaces</p>
        <ul className="max-h-[140px] space-y-0.5 overflow-y-auto overscroll-contain">
          {workspaces.map((w) => {
            const isActive = String(w._id) === String(activeWorkspaceId || '')
            return (
              <li key={w._id}>
                <button
                  type="button"
                  onClick={() => switchWorkspace(w)}
                  title={w.name}
                  className={`flex w-full items-center truncate rounded-xl px-2.5 py-2 text-left text-[12px] font-medium transition-all ${
                    isActive
                      ? 'border border-[#6c63ff]/35 bg-[#6c63ff]/14 text-[var(--wn-fg)]'
                      : 'border border-transparent text-[var(--wn-muted)] hover:bg-[var(--wn-hover)] hover:text-[var(--wn-fg)]'
                  }`}
                >
                  <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#6c63ff]/20 text-[10px] font-bold text-[#a89fff]">
                    {(w.name || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate">{w.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setWorkspaceModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#6c63ff]/40 bg-[#6c63ff]/10 py-2.5 text-[12px] font-bold text-[#c4bdfc] hover:border-[#6c63ff]/55 hover:bg-[#6c63ff]/18"
        >
          <span className="text-base leading-none">+</span> New Workspace
        </motion.button>
      </div>

      <div className="shrink-0 space-y-3 border-t border-[color:var(--wn-border)] p-4">
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--wn-border)] px-2 py-2 transition-all duration-200 hover:bg-[var(--wn-hover)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6c63ff] to-[#4338ca] font-display text-xs font-bold text-white ring-2 ring-[var(--wn-avatar-ring)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-semibold text-[var(--wn-fg)]">{user?.name || 'User'}</div>
            <div className="truncate text-xs text-[var(--wn-muted)]">{user?.email || ''}</div>
          </div>
        </div>
      </div>

      {modal}
    </aside>
  )
}
