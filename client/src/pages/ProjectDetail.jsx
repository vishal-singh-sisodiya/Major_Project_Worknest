import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../utils/api.js'
import { useSocket } from '../context/SocketContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { KanbanBoard } from '../components/kanban/KanbanBoard.jsx'
import { TaskModal } from '../components/tasks/TaskModal.jsx'
import { toastError, toastSuccess } from '../utils/toast.js'

function workspaceId() {
  return localStorage.getItem('workspaceId')
}

function statusLabel(s) {
  if (s === 'todo') return 'To Do'
  if (s === 'inprogress') return 'In Progress'
  if (s === 'done') return 'Done'
  return s || '—'
}

function deriveWorkspaceStr(wsRef) {
  if (wsRef == null) return ''
  if (typeof wsRef === 'object' && wsRef._id != null) return String(wsRef._id)
  return String(wsRef)
}

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const wid = workspaceId()
  const { socket, joinWorkspace } = useSocket()

  const [tab, setTab] = useState('tasks')
  const [payload, setPayload] = useState(null)
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDefaultStatus, setModalDefaultStatus] = useState(null)
  const [editing, setEditing] = useState(null)
  const [addingMemberId, setAddingMemberId] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [joining, setJoining] = useState(false)

  const loadRef = useRef(async () => {})

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await api.get(`/projects/${id}`)
      setPayload(data)
      setTasks(data.tasks || [])
    } catch (err) {
      setPayload(null)
      setTasks([])
      const msg =
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot reach API — check the server is running (e.g. port 5000).'
          : err.message || 'Something went wrong')
      setLoadError({ message: msg, status: err.response?.status })
    } finally {
      setLoading(false)
    }
  }, [id])

  loadRef.current = load

  useEffect(() => {
    setPayload(null)
    setTasks([])
    setLoadError(null)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  /** Prefer the project's workspace id (fixes stale localStorage vs deep-link). Sync localStorage quietly. */
  useEffect(() => {
    const p = payload?.project
    const fromProj = deriveWorkspaceStr(p?.workspaceId)
    const target = fromProj || wid
    if (!target) return
    joinWorkspace?.(target)
    api
      .get(`/workspaces/${target}`)
      .then(({ data }) => setWorkspaceMembers(data.members || []))
      .catch(() => {})
    if (fromProj && String(wid || '') !== fromProj) {
      localStorage.setItem('workspaceId', fromProj)
    }
  }, [payload, wid, joinWorkspace])

  /** Live updates only once you belong to the project (have a project role). */
  useEffect(() => {
    if (!socket || !id) return undefined
    if (!payload?.myRole) return undefined

    const sync = () => loadRef.current()
    socket.emit('join-project', { projectId: id })
    socket.on('task-moved', sync)
    socket.on('task-updated', sync)
    socket.on('task-created', sync)
    socket.on('task-deleted', sync)
    socket.on('project-updated', sync)

    return () => {
      socket.off('task-moved', sync)
      socket.off('task-updated', sync)
      socket.off('task-created', sync)
      socket.off('task-deleted', sync)
      socket.off('project-updated', sync)
    }
  }, [socket, id, payload?.myRole])

  const proj = payload?.project
  const needsJoinGate = payload?.needsJoin === true && payload?.myRole == null
  const projWidStr = deriveWorkspaceStr(proj?.workspaceId)
  const effectiveWid = projWidStr || String(wid || '')

  const joinSelf = async () => {
    if (!id || joining) return
    setJoining(true)
    try {
      await api.post(`/projects/${id}/join`)
      toastSuccess('Joined project')
      await load()
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not join'
      toastError(msg)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-full max-w-xl rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (loadError) {
    const notFound = loadError.status === 404
    return (
      <div className="wn-card mx-auto max-w-lg rounded-xl p-8 text-center">
        <h1 className="font-display text-xl font-bold text-[var(--wn-fg)]">
          {notFound ? 'Project not found' : 'Could not load project'}
        </h1>
        <p className="mt-3 text-sm text-[var(--wn-muted)]">
          {notFound
            ? 'This link may be invalid or the project was removed.'
            : loadError.message}
        </p>
        {!notFound && loadError.status && (
          <p className="mt-2 font-mono text-xs text-[var(--wn-muted)]">HTTP {loadError.status}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/tasks"
            className="inline-flex items-center justify-center rounded-xl border border-[color:var(--wn-border-strong)] bg-[var(--wn-hover)] px-5 py-2.5 font-bold text-[var(--wn-fg)] hover:border-[#6c63ff]/40"
          >
            ← Back to tasks
          </Link>
          {!notFound && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => load()}
              className="rounded-xl bg-[#6c63ff] px-5 py-2.5 font-bold text-white"
            >
              Try again
            </motion.button>
          )}
          <Link
            to="/"
            className="rounded-xl border border-[color:var(--wn-border-strong)] px-5 py-2.5 font-bold text-[var(--wn-fg)]"
          >
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!proj) {
    return (
      <p className="text-[var(--wn-muted)]">
        Unknown project — go back to <Link className="text-[#6c63ff]" to="/tasks">Tasks</Link>.
      </p>
    )
  }

  const canManage = payload?.canManageMembers
  const canEditTasks =
    !needsJoinGate && (payload?.myRole === 'member' || payload?.myRole === 'manager')
  const projectOptions =
    proj && !needsJoinGate ? [{ _id: proj._id, name: proj.name, icon: proj.icon }] : []
  const projectMembersFormatted =
    needsJoinGate || !proj?.members?.length
      ? []
      : proj.members.filter((entry) => entry?.user != null && entry.user._id != null)

  const nonProjectMembers =
    workspaceMembers?.filter((m) => !proj?.members?.some((p) => p.user?._id === m.user?._id)) ||
    []

  const addMemberSubmit = async (e) => {
    e.preventDefault()
    if (!addingMemberId || !proj) return
    try {
      await api.post(`/projects/${proj._id}/members`, {
        userId: addingMemberId,
        role: memberRole,
      })
      toastSuccess('Member added')
      setAddingMemberId('')
      load()
    } catch (err) {
      toastError(err.response?.data?.message || 'Could not add')
    }
  }

  const removeMember = async (targetId) => {
    if (!canManage || !proj) return
    if (!confirm('Remove member from project?')) return
    try {
      await api.delete(`/projects/${proj._id}/members/${targetId}`)
      load()
      toastSuccess('Updated')
    } catch (err) {
      toastError(err.response?.data?.message || 'Remove failed')
    }
  }

  const changeProjMemberRole = async (targetId, role) => {
    if (!canManage || !proj) return
    try {
      await api.put(`/projects/${proj._id}/members/${targetId}`, { role })
      load()
    } catch (err) {
      toastError(err.response?.data?.message || 'Update failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-xs font-semibold text-[var(--wn-muted)] hover:text-[#6c63ff]">
            ← Dashboard
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: proj.color || '#6c63ff' }}
            >
              {(proj.name || '?').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">{proj.name}</h1>
              <p className="mt-1 max-w-xl text-sm text-[var(--wn-muted)]">{proj.description || 'No description'}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {projectMembersFormatted.slice(0, 8).map((m) => (
              <div
                key={m.user._id}
                title={m.user.name}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6c63ff] to-[#4338ca] text-xs font-bold text-white ring-2 ring-[var(--wn-panel)]"
              >
                {(m.user.name || '?').slice(0, 2).toUpperCase()}
              </div>
            ))}
            {projectMembersFormatted.length > 8 && (
              <span className="self-center text-sm text-[var(--wn-muted)]">
                +{projectMembersFormatted.length - 8}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {needsJoinGate && (
            <motion.button
              type="button"
              disabled={joining}
              whileHover={{ scale: joining ? 1 : 1.02 }}
              whileTap={{ scale: joining ? 1 : 0.98 }}
              onClick={joinSelf}
              className="rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-5 py-2.5 font-display font-bold text-white disabled:pointer-events-none disabled:opacity-50"
            >
              {joining ? 'Joining…' : 'Join project'}
            </motion.button>
          )}
          {!needsJoinGate && canEditTasks && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                setEditing(null)
                setModalDefaultStatus(null)
                setModalOpen(true)
              }}
              className="rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-5 py-2.5 font-display font-bold text-white"
            >
              + Task
            </motion.button>
          )}
        </div>
      </div>

      {needsJoinGate && (
        <motion.div
          className="wn-card rounded-xl border border-[#6c63ff]/30 bg-[#6c63ff]/10 p-5 text-center"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-semibold text-[var(--wn-fg)]">
            Join this project to see tasks and members — you&apos;re already in the workspace.
          </p>
          <p className="mt-2 text-xs text-[var(--wn-muted)]">
            Previously this looked like “could not load” because viewing was blocked while you weren&apos;t
            assigned to the project.
          </p>
        </motion.div>
      )}

      {!needsJoinGate && (
        <>
          <div className="flex flex-wrap gap-2 border-b border-[color:var(--wn-border)] pb-1">
            {['tasks', 'members', 'activity'].map((t) => (
              <button
                key={t}
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
                  tab === t ? 'bg-[#6c63ff]/20 text-[var(--wn-fg)]' : 'text-[var(--wn-muted)] hover:bg-[var(--wn-hover)]'
                }`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'tasks' && (
            <KanbanBoard
              workspaceId={effectiveWid}
              projectId={proj._id}
              tasks={tasks}
              setTasks={setTasks}
              readOnly={!canEditTasks}
              onAddTask={
                canEditTasks
                  ? (colStatus) => {
                      setEditing(null)
                      setModalDefaultStatus(colStatus || 'todo')
                      setModalOpen(true)
                    }
                  : undefined
              }
            />
          )}

          {tab === 'members' && (
            <div className="wn-card rounded-xl p-5">
              {canManage && nonProjectMembers.length > 0 && (
                <form
                  onSubmit={addMemberSubmit}
                  className="mb-6 flex flex-wrap items-end gap-3 border-b border-[color:var(--wn-border)] pb-6"
                >
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--wn-muted)]">Workspace member</span>
                    <select
                      value={addingMemberId}
                      onChange={(e) => setAddingMemberId(e.target.value)}
                      className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-3 py-2 text-[var(--wn-fg)]"
                    >
                      <option value="">Select…</option>
                      {nonProjectMembers.map((m) => (
                        <option key={m.user._id} value={m.user._id}>
                          {m.user.name} ({m.user.email})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--wn-muted)]">Role</span>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-3 py-2 text-[var(--wn-fg)]"
                    >
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                      <option value="manager">Manager</option>
                    </select>
                  </label>
                  <button type="submit" className="rounded-xl bg-[#6c63ff] px-4 py-2 text-sm font-bold text-white">
                    Add Member
                  </button>
                </form>
              )}
              <ul className="divide-y divide-[color:var(--wn-border)]">
                {projectMembersFormatted.map((m) => (
                  <li key={m.user._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-semibold text-[var(--wn-fg)]">{m.user.name}</div>
                      <div className="text-xs text-[var(--wn-muted)]">{m.user.email}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canManage ? (
                        <select
                          value={m.role}
                          onChange={(e) => changeProjMemberRole(m.user._id, e.target.value)}
                          className="rounded-lg border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-2 py-1 text-xs"
                        >
                          <option value="manager">manager</option>
                          <option value="member">member</option>
                          <option value="viewer">viewer</option>
                        </select>
                      ) : (
                        <span className="text-xs text-[var(--wn-muted)]">{m.role}</span>
                      )}
                      {canManage && m.user._id !== user?._id && (
                        <button
                          type="button"
                          onClick={() => removeMember(m.user._id)}
                          className="text-xs font-semibold text-rose-400 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'activity' && (
            <ul className="wn-card divide-y divide-[color:var(--wn-border)] overflow-hidden rounded-xl p-0">
              {(payload.activity || []).map((item) => (
                <li key={item._id} className="flex flex-wrap gap-4 px-4 py-3 text-sm">
                  <span className="text-[var(--wn-muted)]">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
                  </span>
                  <span className="font-medium text-[var(--wn-fg)]">{item.title}</span>
                  <span className="rounded-md bg-[var(--wn-deep)] px-2 py-0.5 text-xs text-[var(--wn-muted)]">
                    {statusLabel(item.status)}
                  </span>
                </li>
              ))}
              {(payload.activity || []).length === 0 && (
                <li className="px-4 py-8 text-center text-[var(--wn-muted)]">No activity yet.</li>
              )}
            </ul>
          )}
        </>
      )}

      {!needsJoinGate && (
        <TaskModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
            setModalDefaultStatus(null)
          }}
          workspaceId={effectiveWid}
          task={editing}
          projects={projectOptions}
          selectedProjectId={proj._id}
          members={projectMembersFormatted.map((x) => ({ user: x.user, role: x.role }))}
          defaultStatus={modalDefaultStatus || undefined}
          onSaved={load}
        />
      )}
    </div>
  )
}
