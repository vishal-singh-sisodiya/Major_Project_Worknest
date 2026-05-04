import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { toastSuccess, toastError } from '../utils/toast.js'

function formatInvite(code) {
  if (!code) return '—'
  const raw = String(code).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const parts = []
  for (let i = 0; i < raw.length; i += 4) parts.push(raw.slice(i, i + 4))
  return parts.join('-') || code
}

function badgeStyle(label) {
  const L = label.toLowerCase()
  if (L === 'admin')
    return 'border-[#8b5cf6]/35 bg-[#6c63ff]/20 text-[var(--wn-fg)]'
  if (L === 'designer')
    return 'border-blue-400/35 bg-blue-500/15 text-blue-100'
  if (L === 'developer')
    return 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
  if (L === 'viewer')
    return 'border-[color:var(--wn-border-strong)] bg-[var(--wn-hover-strong)] text-[var(--wn-muted)]'
  return 'border-amber-400/35 bg-amber-500/15 text-amber-100'
}

/** Map API workspace roles → display label + flair for collaborators. */
function displayRole(role, index) {
  const r = (role || 'member').toLowerCase()
  if (r === 'admin') return 'Admin'
  if (r === 'viewer') return 'Viewer'
  if (index % 2 === 1) return 'Designer'
  return 'Developer'
}

/** Deterministic UX status dots (offline until realtime presence lands). */
function memberStatus(seed) {
  const h = [...String(seed)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 3
  const map = ['online', 'away', 'offline']
  const s = map[h]
  if (s === 'online')
    return { label: 'Online', dot: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]', ring: '' }
  if (s === 'away')
    return { label: 'Away', dot: 'bg-amber-400', ring: '' }
  return { label: 'Offline', dot: 'bg-[#475569]', ring: 'opacity-60' }
}

export default function Team() {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [current, setCurrent] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [workspaceProjects, setWorkspaceProjects] = useState({ mine: [], discover: [] })
  const [recentActivity, setRecentActivity] = useState([])
  const [newProjName, setNewProjName] = useState('')
  const [newProjDesc, setNewProjDesc] = useState('')
  const [creatingProj, setCreatingProj] = useState(false)

  const load = async () => {
    try {
      const { data } = await api.get('/workspaces/my')
      setWorkspaces(data)
      let wid = localStorage.getItem('workspaceId')
      if (wid && data.some((w) => w._id === wid)) {
        const { data: detail } = await api.get(`/workspaces/${wid}`)
        setCurrent(detail)
      } else if (data[0]) {
        wid = data[0]._id
        localStorage.setItem('workspaceId', wid)
        const { data: detail } = await api.get(`/workspaces/${wid}`)
        setCurrent(detail)
      }
    } catch {
      toastError('Could not load team')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const loadWorkspaceOverview = async (wid) => {
    if (!wid) {
      setWorkspaceProjects({ mine: [], discover: [] })
      setRecentActivity([])
      return
    }
    try {
      const [{ data: projData }, { data: taskData }] = await Promise.all([
        api.get(`/projects/workspace/${wid}`),
        api.get(`/tasks/${wid}`),
      ])
      setWorkspaceProjects({
        mine: projData?.mine || [],
        discover: projData?.discover || [],
      })
      const acts = [...(taskData || [])]
        .filter((t) => t.updatedAt)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 8)
      setRecentActivity(acts)
    } catch {
      setWorkspaceProjects({ mine: [], discover: [] })
      setRecentActivity([])
    }
  }

  useEffect(() => {
    if (current?._id) loadWorkspaceOverview(current._id)
  }, [current?._id])

  const joinProject = async (projectId) => {
    try {
      await api.post(`/projects/${projectId}/join`)
      toastSuccess('Joined project')
      await loadWorkspaceOverview(current._id)
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (/already.*project member/i.test(msg)) {
        toastSuccess('You are already in this project')
        await loadWorkspaceOverview(current._id)
        return
      }
      toastError(msg || 'Could not join project')
    }
  }

  const selectWs = async (id) => {
    localStorage.setItem('workspaceId', id)
    const { data } = await api.get(`/workspaces/${id}`)
    setCurrent(data)
  }

  const copyInvite = async () => {
    if (!current?.inviteCode) return
    const text = formatInvite(current.inviteCode)
    try {
      await navigator.clipboard.writeText(text)
      toastSuccess('Invite code copied')
    } catch {
      toastError('Copy failed — select and copy manually')
    }
  }

  const createWorkspaceProject = async (e) => {
    e.preventDefault()
    if (!current?._id || !newProjName.trim()) return
    setCreatingProj(true)
    try {
      await api.post('/projects', {
        workspaceId: current._id,
        name: newProjName.trim(),
        description: newProjDesc.trim() || undefined,
        icon: '',
        color: '#6c63ff',
      })
      toastSuccess('Project created — you are the manager')
      setNewProjName('')
      setNewProjDesc('')
      await loadWorkspaceOverview(current._id)
    } catch (err) {
      toastError(err.response?.data?.message || 'Could not create project')
    } finally {
      setCreatingProj(false)
    }
  }

  const join = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    try {
      await api.post('/workspaces/join', { inviteCode: joinCode.trim() })
      setJoinCode('')
      toastSuccess('Joined workspace')
      load()
    } catch (err) {
      toastError(err.response?.data?.message || 'Join failed')
    }
  }

  const changeRole = async (memberId, role) => {
    if (!current?._id) return
    const allowed = ['admin', 'member', 'viewer']
    if (!allowed.includes(role)) return
    try {
      await api.put(`/workspaces/${current._id}/members/${memberId}`, { role })
      toastSuccess('Role updated')
      const { data } = await api.get(`/workspaces/${current._id}`)
      setCurrent(data)
    } catch (err) {
      toastError(err.response?.data?.message || 'Update failed')
    }
  }

  const removeMember = async (memberId) => {
    if (!current?._id) return
    if (!confirm('Remove this member from the workspace?')) return
    try {
      await api.delete(`/workspaces/${current._id}/members/${memberId}`)
      toastSuccess('Member removed')
      const { data } = await api.get(`/workspaces/${current._id}`)
      setCurrent(data)
    } catch (err) {
      toastError(err.response?.data?.message || 'Remove failed')
    }
  }

  const isAdmin = current?.myRole === 'admin'

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">Team</h1>
          <p className="mt-1 text-sm text-[var(--wn-muted)]">Manage your team and collaborate</p>
        </div>
        <motion.span
          className="inline-flex rounded-xl border border-[#6c63ff]/30 bg-[#6c63ff]/15 px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-[#a78bfa]"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          + Invite Member
        </motion.span>
      </div>

      <div className="flex flex-wrap gap-2">
        {workspaces.map((w) => (
          <motion.button
            key={w._id}
            type="button"
            whileHover={{ scale: 1.03 }}
            onClick={() => selectWs(w._id)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              current?._id === w._id
                ? 'border-[#6c63ff] bg-[#6c63ff]/25 text-[var(--wn-fg)]'
                : 'border-[color:var(--wn-border)] bg-[var(--wn-panel)] text-[var(--wn-muted)]'
            }`}
          >
            {w.name}
          </motion.button>
        ))}
      </div>

      {current && (
        <>
          <motion.div className="wn-card rounded-xl p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--wn-muted)]">Invite code</div>
            <div className="flex flex-wrap items-center gap-3">
              <code className="font-display text-2xl font-extrabold tracking-[0.2em] text-[#6c63ff] sm:text-3xl">
                {formatInvite(current.inviteCode)}
              </code>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={copyInvite}
                className="wn-btn rounded-xl border border-[color:var(--wn-border-strong)] bg-[var(--wn-deep)] px-5 py-2.5 font-bold text-[var(--wn-fg)]"
              >
                Copy
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            className="wn-card rounded-xl p-6"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--wn-fg)]">Workspace overview</h2>
                <p className="mt-1 text-xs text-[var(--wn-muted)]">Projects you can open, browse, or join</p>
              </div>
              <Link
                to="/tasks"
                className="rounded-lg border border-[color:var(--wn-border-strong)] bg-[var(--wn-deep)] px-4 py-2 text-xs font-bold text-[#6c63ff] hover:bg-[var(--wn-hover-strong)]"
              >
                Boards
              </Link>
            </div>

            {(workspaceProjects.mine?.length > 0 || workspaceProjects.discover?.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[...(workspaceProjects.mine || []), ...(workspaceProjects.discover || [])].map((proj) => {
                  const total = proj.taskTotal ?? 0
                  const done = proj.taskDone ?? 0
                  const pct = total ? Math.round((done / total) * 100) : 0
                  const inProject = proj.myRole
                  return (
                    <div
                      key={proj._id}
                      className="flex flex-col rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ background: proj.color || '#6c63ff' }}
                        >
                          {(proj.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-display font-bold text-[var(--wn-fg)]">{proj.name}</div>
                          <div className="mt-1 text-[11px] text-[var(--wn-muted)]">
                            {proj.members?.length ?? 0} members · {done}/{total} done ({pct}%)
                          </div>
                          {proj.myRole && (
                            <span className="mt-2 inline-block rounded-md bg-[#6c63ff]/18 px-2 py-0.5 text-[10px] font-bold uppercase text-[#a78bfa]">
                              {proj.myRole}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {inProject ? (
                          <Link
                            to={`/projects/${proj._id}`}
                            className="rounded-lg bg-[#6c63ff]/20 px-4 py-2 text-xs font-bold text-[var(--wn-fg)] hover:bg-[#6c63ff]/30"
                          >
                            Open
                          </Link>
                        ) : (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => joinProject(proj._id)}
                            className="rounded-lg bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-4 py-2 text-xs font-bold text-white"
                          >
                            Join project
                          </motion.button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {(workspaceProjects.mine?.length === 0 && workspaceProjects.discover?.length === 0) && (
              <p className="text-sm text-[var(--wn-muted)]">No projects yet. Create one from the dashboard tasks flow or ask a manager.</p>
            )}
          </motion.div>

          {recentActivity.length > 0 && (
            <motion.div className="wn-card rounded-xl p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="font-display mb-4 text-lg font-bold text-[var(--wn-fg)]">Recent workspace activity</h2>
              <ul className="divide-y divide-[color:var(--wn-border)] text-sm">
                {recentActivity.map((t) => (
                  <li key={t._id} className="flex flex-wrap items-center gap-3 py-2">
                    <span className="text-xs text-[var(--wn-muted)]">
                      {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '—'}
                    </span>
                    <span className="font-medium text-[var(--wn-fg)]">{t.title}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          <motion.form onSubmit={createWorkspaceProject} className="wn-card rounded-xl p-5" layout>
            <p className="mb-3 text-xs font-bold uppercase text-[var(--wn-muted)]">Create project</p>
            <p className="mb-4 text-xs text-[var(--wn-muted)]">
              Projects group tasks for your workspace. Tasks go to the shared inbox project (named General) when you choose &quot;No project&quot; in the task form.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <input
                required
                placeholder="Project name"
                className="min-w-[200px] flex-1 rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
              />
              <input
                placeholder="Description (optional)"
                className="min-w-[200px] flex-1 rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                value={newProjDesc}
                onChange={(e) => setNewProjDesc(e.target.value)}
              />
              <motion.button
                type="submit"
                disabled={creatingProj}
                whileHover={{ scale: creatingProj ? 1 : 1.02 }}
                className="rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-8 py-3 font-display font-bold text-white disabled:pointer-events-none disabled:opacity-50"
              >
                {creatingProj ? 'Creating…' : 'Create project'}
              </motion.button>
            </div>
          </motion.form>

          <motion.form onSubmit={join} className="wn-card rounded-xl p-4" layout>
            <p className="mb-3 text-xs font-bold uppercase text-[var(--wn-muted)]">Join workspace</p>
            <div className="flex flex-wrap gap-2">
              <input
                placeholder="Paste invite code"
                className="min-w-[200px] flex-1 rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                className="rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-8 py-3 font-display font-bold text-white"
              >
                Join
              </motion.button>
            </div>
          </motion.form>

          <div className="wn-card rounded-xl overflow-hidden border border-[color:var(--wn-border)]">
            <div className="border-b border-[color:var(--wn-border)] px-6 py-4 font-display font-bold text-[var(--wn-fg)]">
              Team members
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full border-collapse">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-[var(--wn-muted)]">
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Status</th>
                    {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {current.members?.map((entry, idx) => {
                    const m = entry.user
                    const id = m?._id
                    const name = m?.name || `Member ${idx + 1}`
                    const email = m?.email || '—'
                    const label = displayRole(entry.role, idx)
                    const st = memberStatus(`${id}-${idx}`)
                    const ownerSid = current.owner ? String(current.owner._id ?? current.owner) : ''
                    const isOwnerMember = ownerSid && id && String(id) === ownerSid
                    const canManage = isAdmin && id && id !== user?._id && !isOwnerMember
                    const initials = name.slice(0, 2).toUpperCase()

                    return (
                      <motion.tr
                        key={String(id)}
                        layout
                        className="border-t border-[color:var(--wn-border)] hover:bg-[var(--wn-hover-tint)]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6c63ff] to-[#4338ca] text-xs font-bold text-white">
                              {initials}
                            </div>
                            <span className="font-semibold text-[var(--wn-fg)]">{name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[var(--wn-muted)]">{email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-lg border px-3 py-1 text-[11px] font-bold ${badgeStyle(label)}`}>
                            {label}
                          </span>
                          {canManage && (
                            <select
                              className="ml-3 rounded-lg border border-[color:var(--wn-border-strong)] bg-[var(--wn-deep)] px-2 py-1 text-[11px] text-[var(--wn-fg)]"
                              value={entry.role}
                              onChange={(e) => changeRole(id, e.target.value)}
                            >
                              <option value="admin">admin</option>
                              <option value="member">member</option>
                              <option value="viewer">viewer</option>
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${st.dot} ${st.ring}`} />
                            <span className="text-xs font-medium text-[var(--wn-muted)]">{st.label}</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <motion.button
                              type="button"
                              disabled={!canManage}
                              whileHover={canManage ? { scale: 1.02 } : undefined}
                              onClick={() => canManage && removeMember(id)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                                canManage
                                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                                  : 'cursor-not-allowed border-transparent text-[#475569]'
                              }`}
                            >
                              Remove
                            </motion.button>
                          </td>
                        )}
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}