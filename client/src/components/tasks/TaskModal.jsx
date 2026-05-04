import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '../../utils/api.js'
import { toastError, toastSuccess } from '../../utils/toast.js'

/** @typedef {{ _id?: string, name?: string, email?: string, avatar?: string }} UserBrief */

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   workspaceId?: string|null,
 *   task?: object|null,
 *   projects?: Array<{ _id: string, name: string }>,
 *   selectedProjectId?: string,
 *   defaultToInbox?: boolean,
 *   members?: Array<{ user: UserBrief, role?: string }>,
 *   defaultDueDate?: string,
 *   defaultStatus?: string,
 *   readOnly?: boolean,
 *   onSaved?: () => void,
 * }} props
 */
export function TaskModal({
  open,
  onClose,
  workspaceId,
  task,
  projects = [],
  selectedProjectId = '',
  defaultToInbox = false,
  members = [],
  defaultDueDate,
  defaultStatus,
  readOnly = false,
  onSaved,
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('todo')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState('')
  const [projectId, setProjectId] = useState('')
  const [visibilityMode, setVisibilityMode] = useState('all')
  const [assignedTo, setAssignedTo] = useState([])
  const [visibleTo, setVisibleTo] = useState([])
  const [saving, setSaving] = useState(false)
  const [resolvedMembers, setResolvedMembers] = useState([])
  const [detailRole, setDetailRole] = useState(null)
  const [inboxGeneralId, setInboxGeneralId] = useState(null)

  useEffect(() => {
    if (!open) {
      setDetailRole(null)
      setInboxGeneralId(null)
    }
  }, [open])

  useEffect(() => {
    const editingId = task && task._id
    const useInbox = !editingId && projectId === ''
    if (!open || !workspaceId || !useInbox) {
      if (!useInbox) setInboxGeneralId(null)
      return
    }
    let cancelled = false
    api
      .get(`/projects/workspace/${workspaceId}`)
      .then(({ data }) => {
        if (cancelled) return
        const all = [...(data?.mine || []), ...(data?.discover || [])]
        const g = all.find((p) => p.name === 'General')
        setInboxGeneralId(g ? String(g._id) : null)
      })
      .catch(() => {
        if (!cancelled) setInboxGeneralId(null)
      })
    return () => {
      cancelled = true
    }
  }, [open, workspaceId, projectId, task])

  const detailFetchId = useMemo(() => {
    if (!open) return ''
    if (task && task._id && task.projectId) return String(task.projectId)
    if (!projectId) return inboxGeneralId || ''
    return projectId
  }, [open, task, projectId, inboxGeneralId])

  useEffect(() => {
    if (!open || !detailFetchId) {
      setResolvedMembers([])
      setDetailRole(null)
      return
    }
    let cancelled = false
    setResolvedMembers([])
    setDetailRole(null)
    api
      .get(`/projects/${detailFetchId}/detail`)
      .then(({ data }) => {
        if (cancelled) return
        setDetailRole(data?.myRole ?? null)
        setResolvedMembers((data?.project?.members || []).map((m) => ({ user: m.user, role: m.role })))
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedMembers([])
          setDetailRole(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, detailFetchId])

  const memberUsers = useMemo(() => {
    const source = resolvedMembers.length > 0 ? resolvedMembers : members
    const list = (source || []).map((m) => m.user).filter(Boolean)
    const seen = new Set()
    return list.filter((u) => {
      const id = u._id || u
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [members, resolvedMembers])

  useEffect(() => {
    if (!open) return
    if (task && task._id) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setPriority(task.priority || 'medium')
      setStatus(task.status || 'todo')
      setDueDate(task.dueDate ? String(task.dueDate).slice(0, 10) : '')
      setTags((task.tags || []).join(', '))
      setProjectId((task.projectId && String(task.projectId)) || selectedProjectId || '')
      const asg = task.assignedTo?.length ? task.assignedTo : task.assignees || []
      setAssignedTo((asg || []).map((u) => (typeof u === 'object' && u?._id ? u._id : u)).filter(Boolean))
      const vis = task.visibleTo || []
      const visIds = (vis || []).map((u) => (typeof u === 'object' && u?._id ? u._id : u)).filter(Boolean)
      setVisibleTo(visIds)
      setVisibilityMode(visIds.length ? 'specific' : 'all')
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setStatus(defaultStatus && ['todo', 'inprogress', 'done'].includes(defaultStatus) ? defaultStatus : 'todo')
      setDueDate(defaultDueDate ? String(defaultDueDate).slice(0, 10) : '')
      setTags('')
      let initialProj = ''
      if (selectedProjectId) initialProj = String(selectedProjectId)
      else if (defaultToInbox) initialProj = ''
      else if (projects[0] && projects[0]._id) initialProj = String(projects[0]._id)
      setProjectId(initialProj)
      setAssignedTo([])
      setVisibleTo([])
      setVisibilityMode('all')
    }
  }, [task, open, defaultDueDate, defaultStatus, selectedProjectId, defaultToInbox, projects])

  const ro = readOnly || detailRole === 'viewer'

  const toggleAssigned = (uid) => {
    const id = uid?.toString()
    setAssignedTo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleVisible = (uid) => {
    const id = uid?.toString()
    setVisibleTo((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!workspaceId?.trim()) {
      toastError('Pick a workspace from Team before saving.')
      return
    }
    if (!title.trim()) {
      toastError('Add a title for this task.')
      return
    }
    if (visibilityMode === 'specific' && (!visibleTo || visibleTo.length === 0)) {
      toastError('Pick at least one person for restricted visibility.')
      return
    }

    if (readOnly) return

    setSaving(true)
    try {
      const payload = {
        workspaceId,
        title: title.trim(),
        description,
        priority,
        status,
        dueDate: dueDate || undefined,
        tags: tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        visibilityMode,
        assignedTo,
        visibleTo: visibilityMode === 'all' ? [] : visibleTo,
      }
      if (projectId.trim()) payload.projectId = projectId

      if (task && task._id) {
        await api.put(`/tasks/${task._id}`, payload)
        toastSuccess('Task updated')
      } else {
        await api.post('/tasks', payload)
        toastSuccess('Task created')
      }
      onSaved?.()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not save task'
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="wn-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[color:var(--wn-border-strong)] bg-[var(--wn-panel)] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="font-display mb-4 text-xl font-semibold text-[var(--wn-fg)]">
          {ro ? 'View task' : task && task._id ? 'Edit task' : 'New task'}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--wn-muted)]">Project</span>
            {!task?._id && (
              <p className="mb-2 text-[11px] text-[var(--wn-muted)]">
                No project puts the task in the workspace inbox (General) — shared with teammates on that inbox.
              </p>
            )}
            <select
              disabled={ro || !!(task && task._id)}
              className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-2 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20 disabled:opacity-60"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {!task?._id && (
                <option value="">No project (workspace inbox)</option>
              )}
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name === 'General' ? `${p.name} · inbox` : p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--wn-muted)]">Title</span>
            <input
              required
              readOnly={ro}
              className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-2 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20 disabled:opacity-75"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={ro}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--wn-muted)]">Description</span>
            <textarea
              rows={3}
              readOnly={ro}
              className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-2 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20 disabled:opacity-75"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={ro}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--wn-muted)]">Priority</span>
              <select
                className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-2 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20 disabled:opacity-75"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={ro}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--wn-muted)]">Status</span>
              <select
                className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-2 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20 disabled:opacity-75"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={ro}
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm text-[var(--wn-muted)]">Due date</span>
            <input
              type="date"
              className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-2 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20 disabled:opacity-75"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={ro}
            />
          </label>

          <div className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] p-3">
            <div className="text-sm font-semibold text-[var(--wn-fg)]">Assignees</div>
            <p className="mt-1 text-xs text-[var(--wn-muted)]">Project members only</p>
            <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
              {memberUsers.length === 0 ? (
                <span className="text-xs text-[var(--wn-muted)]">No members loaded — save project context.</span>
              ) : (
                memberUsers.map((u) => {
                  const uid = (u._id || u)?.toString()
                  return (
                    <label
                      key={uid}
                      className={`flex items-center gap-2 text-xs text-[var(--wn-fg)] ${ro ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={assignedTo.includes(uid)}
                        onChange={() => toggleAssigned(uid)}
                        disabled={ro}
                        className="rounded border-[color:var(--wn-border-strong)]"
                      />
                      {u.name || u.email || uid.slice(0, 6)}
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <fieldset className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] p-3">
            <legend className="px-1 text-sm font-semibold text-[var(--wn-fg)]">Visibility</legend>
            <label className={`mt-2 flex items-center gap-2 text-sm text-[var(--wn-fg)] ${ro ? '' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="vis"
                checked={visibilityMode === 'all'}
                onChange={() => setVisibilityMode('all')}
                disabled={ro}
              />
              All project members
            </label>
            <label className={`mt-2 flex items-center gap-2 text-sm text-[var(--wn-fg)] ${ro ? '' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="vis"
                checked={visibilityMode === 'specific'}
                onChange={() => setVisibilityMode('specific')}
                disabled={ro}
              />
              Specific people
            </label>
            {visibilityMode === 'specific' && (
              <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                {memberUsers.map((u) => {
                  const uid = (u._id || u)?.toString()
                  return (
                    <label
                      key={`v-${uid}`}
                      className={`flex items-center gap-2 text-xs text-[var(--wn-fg)] ${ro ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={visibleTo.includes(uid)}
                        onChange={() => toggleVisible(uid)}
                        disabled={ro}
                        className="rounded border-[color:var(--wn-border-strong)]"
                      />
                      {u.name || u.email || uid.slice(0, 6)}
                    </label>
                  )
                })}
              </div>
            )}
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-sm text-[var(--wn-muted)]">Tags (comma separated)</span>
            <input
              className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-2 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20 disabled:opacity-75"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={ro}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[color:var(--wn-border-strong)] px-4 py-2 text-[var(--wn-fg)] hover:bg-[var(--wn-hover-strong)]"
            >
              {ro ? 'Close' : 'Cancel'}
            </button>
            {!ro && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#6c63ff] px-4 py-2 font-semibold text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
