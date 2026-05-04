import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TaskModal } from '../components/tasks/TaskModal.jsx'
import { KanbanBoard } from '../components/kanban/KanbanBoard.jsx'
import api from '../utils/api.js'
import { useSocket } from '../context/SocketContext.jsx'

function wid() {
  return localStorage.getItem('workspaceId')
}

function statusLabel(s) {
  if (s === 'todo') return 'To Do'
  if (s === 'inprogress') return 'In Progress'
  if (s === 'done') return 'Done'
  return s
}

function priorityBadge(p) {
  const base = 'rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase '
  if (p === 'high') return base + 'border-red-400/40 bg-red-500/18 text-red-100'
  if (p === 'low') return base + 'border-emerald-400/40 bg-emerald-500/18 text-emerald-100'
  return base + 'border-amber-400/40 bg-amber-500/18 text-amber-100'
}

export default function Tasks() {
  const workspace = wid()
  const { socket, joinWorkspace } = useSocket()
  const [projectsMine, setProjectsMine] = useState([])
  const [selectedProject, setSelectedProject] = useState(() => localStorage.getItem('worknest_projectId') || '')
  const [projectMembers, setProjectMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [defaultStatus, setDefaultStatus] = useState(null)
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [layout, setLayout] = useState('kanban')

  const loadProjects = useCallback(async () => {
    if (!workspace) return
    try {
      const { data } = await api.get(`/projects/workspace/${workspace}`)
      const mine = data?.mine || []
      setProjectsMine(mine)
      let next = localStorage.getItem('worknest_projectId') || ''
      if (!mine.some((p) => p._id === next)) next = mine[0]?._id || ''
      setSelectedProject(next)
      if (next) localStorage.setItem('worknest_projectId', next)
      else localStorage.removeItem('worknest_projectId')
    } catch {
      setProjectsMine([])
    }
  }, [workspace])

  const load = useCallback(
    async (silent = false) => {
      if (!workspace || !selectedProject) {
        setTasks([])
        if (!silent) setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      try {
        const { data } = await api.get(`/tasks/project/${selectedProject}`)
        setTasks(Array.isArray(data) ? data : [])
      } catch {
        setTasks([])
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [workspace, selectedProject]
  )

  const loadMembers = useCallback(async () => {
    if (!selectedProject) {
      setProjectMembers([])
      return
    }
    try {
      const { data } = await api.get(`/projects/${selectedProject}/detail`)
      setProjectMembers((data?.project?.members || []).map((m) => ({ user: m.user, role: m.role })))
    } catch {
      setProjectMembers([])
    }
  }, [selectedProject])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (!workspace) return
    joinWorkspace(workspace)
    const maybeReload = () => load(true)
    const reloadProjects = () => loadProjects()
    socket?.on('task-moved', maybeReload)
    socket?.on('task-updated', maybeReload)
    socket?.on('task-created', maybeReload)
    socket?.on('task-deleted', maybeReload)
    socket?.on('project-updated', reloadProjects)
    return () => {
      socket?.off('task-moved', maybeReload)
      socket?.off('task-updated', maybeReload)
      socket?.off('task-created', maybeReload)
      socket?.off('task-deleted', maybeReload)
      socket?.off('project-updated', reloadProjects)
    }
  }, [workspace, socket, joinWorkspace, load, loadProjects])

  const onProjectChange = (id) => {
    setSelectedProject(id)
    if (id) localStorage.setItem('worknest_projectId', id)
    else localStorage.removeItem('worknest_projectId')
  }

  const filtered = useMemo(() => {
    let list = [...tasks]
    if (status !== 'all') list = list.filter((t) => t.status === status)
    if (priority !== 'all') list = list.filter((t) => t.priority === priority)
    return list
  }, [tasks, status, priority])

  const selectedProjectMeta = useMemo(
    () => projectsMine.find((p) => p._id === selectedProject),
    [projectsMine, selectedProject]
  )
  const projectReadOnly = selectedProjectMeta?.myRole === 'viewer'

  const openCreate = (colStatus) => {
    setEditing(null)
    setDefaultStatus(colStatus || null)
    setModalOpen(true)
  }

  if (!workspace) {
    return (
      <p className="text-[var(--wn-muted)]">
        Select a workspace from <Link className="text-[#6c63ff] hover:underline" to="/team">Team</Link>.
      </p>
    )
  }

  if (!projectsMine.length) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">Tasks</h1>
        <p className="text-[var(--wn-muted)]">
          You are not in any project yet. Open{' '}
          <Link className="text-[#6c63ff] hover:underline" to="/team">
            Team
          </Link>{' '}
          and join or create a project.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">Tasks</h1>
          <p className="mt-1 text-sm text-[var(--wn-muted)]">Project-scoped — pick a board below</p>
        </div>
        {!projectReadOnly && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(108,99,255,0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openCreate()}
            className="wn-btn shrink-0 rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-6 py-3 font-display font-bold text-white"
          >
            + Add Task
          </motion.button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--wn-muted)]">
          <span className="font-semibold uppercase tracking-wide text-[11px]">Project</span>
          <select
            className="min-w-[200px] rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] px-3 py-2 text-[var(--wn-fg)]"
            value={selectedProject}
            onChange={(e) => onProjectChange(e.target.value)}
          >
            {projectsMine.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name === 'General' ? `Inbox · ${p.name}` : p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] p-1">
          {[
            ['list', 'List'],
            ['kanban', 'Kanban'],
            ['grid', 'Grid'],
          ].map(([id, label]) => (
            <motion.button
              key={id}
              type="button"
              whileHover={{ scale: 1.02 }}
              onClick={() => setLayout(id)}
              className={`rounded-lg px-4 py-2 text-xs font-bold ${
                layout === id ? 'bg-[#6c63ff] text-white shadow-lg' : 'text-[var(--wn-muted)]'
              }`}
            >
              {label}
            </motion.button>
          ))}
        </div>
        <select
          className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] px-3 py-2 text-sm text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="todo">To Do</option>
          <option value="inprogress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select
          className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] px-3 py-2 text-sm text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <Link to={`/projects/${selectedProject}`} className="text-sm font-semibold text-[#6c63ff] hover:underline">
          Open project →
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!loading && layout === 'kanban' && (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <KanbanBoard
              workspaceId={workspace}
              projectId={selectedProject}
              tasks={tasks}
              setTasks={setTasks}
              readOnly={projectReadOnly}
              onAddTask={(col) => openCreate(col)}
            />
          </motion.div>
        )}

        {!loading && layout === 'list' && (
          <motion.ul
            key="list"
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {filtered.map((t) => (
              <motion.li
                key={t._id}
                layout
                whileHover={{ y: -2 }}
                className={`wn-card wn-card-hover rounded-xl p-4 ${projectReadOnly ? 'cursor-default opacity-95' : 'cursor-pointer'}`}
                onClick={() => {
                  if (projectReadOnly) return
                  setEditing(t)
                  setModalOpen(true)
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-lg font-bold text-[var(--wn-fg)]">{t.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--wn-muted)]">
                      <span className={priorityBadge(t.priority)}>{t.priority}</span>
                      <span className="rounded-lg border border-[color:var(--wn-border)] bg-[var(--wn-hover-strong)] px-2 py-0.5 font-semibold text-[var(--wn-fg)]">
                        {statusLabel(t.status)}
                      </span>
                      <span>Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</span>
                    </div>
                    {t.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--wn-muted)]">{t.description}</p>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-[var(--wn-muted)]">No tasks match these filters.</p>
            )}
          </motion.ul>
        )}

        {!loading && layout === 'grid' && (
          <motion.div
            key="grid"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {filtered.map((t) => (
              <motion.button
                key={t._id}
                type="button"
                whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}
                className={`wn-card wn-card-hover rounded-xl p-4 text-left ${projectReadOnly ? 'cursor-default' : ''}`}
                onClick={() => {
                  if (projectReadOnly) return
                  setEditing(t)
                  setModalOpen(true)
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={priorityBadge(t.priority)}>{t.priority}</span>
                  <span className="text-[10px] font-semibold text-[var(--wn-muted)]">{statusLabel(t.status)}</span>
                </div>
                <div className="font-display text-base font-bold text-[var(--wn-fg)]">{t.title}</div>
                {t.description && (
                  <p className="mt-2 line-clamp-3 text-xs text-[var(--wn-muted)]">{t.description}</p>
                )}
                <div className="mt-3 text-xs text-[var(--wn-muted)]">
                  Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setDefaultStatus(null)
        }}
        workspaceId={workspace}
        task={editing}
        projects={projectsMine.map((p) => ({ _id: p._id, name: p.name, icon: p.icon }))}
        selectedProjectId={selectedProject}
        members={projectMembers}
        defaultStatus={defaultStatus || undefined}
        readOnly={projectReadOnly}
        onSaved={() => {
          load()
          setDefaultStatus(null)
        }}
      />
    </div>
  )
}
