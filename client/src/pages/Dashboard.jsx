import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AIPanel } from '../components/ai/AIPanel.jsx'
import { PomodoroTimer } from '../components/pomodoro/PomodoroTimer.jsx'
import { TaskModal } from '../components/tasks/TaskModal.jsx'
import api from '../utils/api.js'
import { useSocket } from '../context/SocketContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function workspaceId() {
  return localStorage.getItem('workspaceId')
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** GitHub-style grid: columns are Sun–Sat calendar weeks; newest column includes today. */
function taskActivityAlignedWeeks(tasks, numWeeks = 12) {
  const today = startOfDay(new Date())
  const sundayThisWeek = new Date(today)
  sundayThisWeek.setDate(today.getDate() - today.getDay())
  const gridStart = new Date(sundayThisWeek)
  gridStart.setDate(sundayThisWeek.getDate() - (numWeeks - 1) * 7)

  const weeks = []
  for (let w = 0; w < numWeeks; w++) {
    const col = []
    for (let dow = 0; dow < 7; dow++) {
      const cellDate = new Date(gridStart)
      cellDate.setDate(gridStart.getDate() + w * 7 + dow)
      if (cellDate > today) {
        col.push(null)
        continue
      }
      const tCell = startOfDay(cellDate).getTime()
      const count = tasks.filter((task) => {
        const u = task.updatedAt || task.createdAt
        if (!u) return false
        return startOfDay(new Date(u)).getTime() === tCell
      }).length
      col.push({ t: tCell, count })
    }
    weeks.push(col)
  }
  return weeks
}

function heatLevel(count, maxCount) {
  if (count <= 0) return 0
  if (maxCount <= 0) return 0
  const n = count / maxCount
  if (n <= 0.25) return 1
  if (n <= 0.5) return 2
  if (n <= 0.75) return 3
  return 4
}

function DashboardHeatmap({ tasks }) {
  const weeks = useMemo(() => taskActivityAlignedWeeks(tasks || [], 12), [tasks])
  const maxCount = useMemo(() => {
    let m = 0
    for (const w of weeks) for (const d of w) if (d) m = Math.max(m, d.count)
    return m || 1
  }, [weeks])

  const cls = [
    'bg-[var(--wn-deep)] ring-1 ring-white/[0.04]',
    'bg-teal-500/15 ring-1 ring-teal-500/20',
    'bg-teal-500/35 ring-1 ring-teal-400/25',
    'bg-[#6c63ff]/40 ring-1 ring-[#8b5cf6]/35',
    'bg-[#6c63ff]/75 ring-1 ring-[#a78bfa]/45',
  ]

  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className="rounded-2xl border border-[color:var(--wn-border)] bg-[#12121a]/90 p-4 shadow-inner">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-[var(--wn-fg)]">Activity</h3>
          <p className="mt-0.5 text-[11px] text-[var(--wn-muted)]">Task updates across the last 12 weeks</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="flex flex-col justify-between gap-[3px] py-0.5 pr-1 text-[8px] font-bold uppercase text-[var(--wn-muted)]">
          {weekdayLabels.map((d, i) => (
            <div key={`${d}-${i}`} className="flex h-[10px] w-[1.15rem] items-center leading-none">
              {d}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {col.map((cell, di) => {
                if (!cell)
                  return <div key={`${wi}-${di}`} className="h-[10px] w-[10px]" aria-hidden />
                const lvl = heatLevel(cell.count, maxCount)
                return (
                  <div
                    key={`${wi}-${di}`}
                    title={new Date(cell.t).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    className={`h-[10px] w-[10px] rounded-sm transition-transform hover:scale-125 hover:ring-2 hover:ring-[#6c63ff]/50 ${cls[lvl]}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-[var(--wn-muted)]">
        <span>Less</span>
        <div className="flex gap-1">
          {cls.map((c, i) => (
            <div key={i} className={`h-[10px] w-[10px] rounded-sm ${c}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

function QuickNotes({ notes }) {
  const top = notes.slice(0, 8)
  return (
    <div className="flex h-full min-h-[200px] flex-col rounded-2xl border border-[color:var(--wn-border)] bg-[#12121a]/90 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold text-[var(--wn-fg)]">Quick Notes</h3>
          <p className="mt-0.5 text-[11px] text-[var(--wn-muted)]">From your workspace</p>
        </div>
        <Link to="/notes" className="text-[11px] font-bold text-[#6c63ff] hover:underline">
          All notes
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="flex-1 text-sm text-[var(--wn-muted)]">No notes yet. Capture ideas from the Notes page.</p>
      ) : (
        <ul className="flex-1 space-y-3">
          {top.map((n) => (
            <li key={n._id} className="flex gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/80" />
              <Link to="/notes" className="text-[var(--wn-fg)]/90 hover:text-[#a78bfa]">
                {n.title?.trim() || 'Untitled'}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function useCountUp(end, duration = 800) {
  const [n, setN] = useState(0)
  const startRef = useRef(null)
  useEffect(() => {
    startRef.current = null
    const step = (t) => {
      if (!startRef.current) startRef.current = t
      const p = Math.min((t - startRef.current) / duration, 1)
      setN(Math.round((1 - (1 - p) ** 3) * end))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration])
  return n
}

function statusLabel(status) {
  if (status === 'todo') return 'To Do'
  if (status === 'inprogress') return 'In Progress'
  if (status === 'done') return 'Done'
  return status || '—'
}

function priorityStyle(p) {
  if (p === 'high') return 'bg-red-500/18 text-red-200 border-red-400/35'
  if (p === 'low') return 'bg-emerald-500/18 text-emerald-200 border-emerald-400/35'
  return 'bg-amber-500/18 text-amber-100 border-amber-400/35'
}

function statusStyle(s) {
  if (s === 'done') return 'bg-blue-500/15 text-blue-200 border-blue-400/35'
  if (s === 'inprogress') return 'bg-blue-500/15 text-blue-200 border-blue-400/35'
  return 'bg-[var(--wn-hover-strong)] text-[var(--wn-muted)] border-[color:var(--wn-border-strong)]'
}

function TableSkeleton({ rows = 6 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-[color:var(--wn-border)]">
          <td className="p-4" colSpan={4}>
            <div className="skeleton h-4 w-[70%] rounded-lg" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}

export default function Dashboard() {
  const wid = workspaceId()
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [taskModal, setTaskModal] = useState(false)
  const [myProjects, setMyProjects] = useState([])
  const [dashMembers, setDashMembers] = useState([])
  const { socket, joinWorkspace } = useSocket()

  const loadTasks = useCallback(async (silent = false) => {
    if (!wid) return
    if (!silent) setLoading(true)
    try {
      const { data } = await api.get(`/tasks/${wid}`)
      setTasks(data)
    } catch {
      setTasks([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [wid])

  const loadNotes = useCallback(async () => {
    if (!wid) return
    try {
      const { data } = await api.get(`/notes/${wid}`)
      setNotes(Array.isArray(data) ? data : [])
    } catch {
      setNotes([])
    }
  }, [wid])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const refreshMyProjects = useCallback(async () => {
    if (!wid) return
    try {
      const { data } = await api.get(`/projects/workspace/${wid}`)
      const mine = data?.mine || []
      setMyProjects(mine)
      const first = mine[0]
      if (first) {
        const { data: det } = await api.get(`/projects/${first._id}/detail`)
        setDashMembers((det?.project?.members || []).map((m) => ({ user: m.user, role: m.role })))
      } else setDashMembers([])
    } catch {
      setMyProjects([])
      setDashMembers([])
    }
  }, [wid])

  useEffect(() => {
    refreshMyProjects()
  }, [refreshMyProjects])

  useEffect(() => {
    if (!wid) return
    joinWorkspace(wid)
    const syncTasks = (p) => {
      if (p?.workspaceId && p.workspaceId !== wid) return
      loadTasks(true)
    }
    const syncProjects = () => refreshMyProjects()
    socket?.on('task-moved', syncTasks)
    socket?.on('task-updated', syncTasks)
    socket?.on('task-created', syncTasks)
    socket?.on('task-deleted', syncTasks)
    socket?.on('project-updated', syncProjects)
    return () => {
      socket?.off('task-moved', syncTasks)
      socket?.off('task-updated', syncTasks)
      socket?.off('task-created', syncTasks)
      socket?.off('task-deleted', syncTasks)
      socket?.off('project-updated', syncProjects)
    }
  }, [wid, socket, joinWorkspace, loadTasks, refreshMyProjects])

  const greetingName = user?.name?.split(' ')[0] || 'there'

  const completed = tasks.filter((t) => t.status === 'done').length
  const inProgress = tasks.filter((t) => t.status === 'inprogress').length
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  ).length
  const activeProjectCount = myProjects.length
  const efficiencyPct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0

  const cntTotal = useCountUp(tasks.length)
  const cntProjects = useCountUp(activeProjectCount)
  const cntDone = useCountUp(completed)
  const cntEff = useCountUp(efficiencyPct)

  const tableTasks = [...tasks].slice(0, 8)

  if (!wid) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[50vh] items-center justify-center text-center text-[var(--wn-muted)]"
      >
        Open{' '}
        <Link to="/team" className="mx-1 font-semibold text-[#6c63ff] hover:underline">
          Team
        </Link>{' '}
        and select a workspace first.
      </motion.div>
    )
  }

  return (
    <div className="min-h-full space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <motion.h1
            className="font-display text-2xl font-extrabold tracking-tight text-[var(--wn-fg)] sm:text-[1.85rem]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Hey, {greetingName}
          </motion.h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--wn-muted)]">Here&apos;s what&apos;s happening in your workspace.</p>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setTaskModal(true)}
          className="shrink-0 rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#6366f1] px-7 py-3 font-display text-sm font-bold text-white shadow-lg shadow-[#6c63ff]/25 ring-1 ring-white/10"
        >
          Create New
        </motion.button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Total Tasks',
                val: cntTotal,
                sub: inProgress > 0 ? `${inProgress} in progress` : tasks.length ? 'All caught up' : 'No tasks yet',
                subClass: 'text-[var(--wn-muted-strong)]',
                delay: 0.02,
              },
              {
                label: 'Active Projects',
                val: cntProjects,
                sub: activeProjectCount === 1 ? '1 board' : `${activeProjectCount} boards`,
                subClass: 'text-[var(--wn-muted-strong)]',
                delay: 0.06,
              },
              {
                label: 'Completed',
                val: cntDone,
                sub:
                  tasks.length && completed === tasks.length
                    ? 'All tasks done'
                    : `${Math.max(0, tasks.length - completed)} open`,
                subClass: completed > 0 ? 'text-teal-400/90' : 'text-[var(--wn-muted-strong)]',
                delay: 0.1,
              },
              {
                label: 'Efficiency',
                val: `${cntEff}%`,
                sub: overdue > 0 ? `${overdue} overdue` : efficiencyPct >= 70 ? 'Strong completion rate' : 'Room to ship more',
                subClass: overdue > 0 ? 'text-amber-400/90' : 'text-[var(--wn-muted-strong)]',
                delay: 0.14,
              },
            ].map((s) => (
              <motion.div
                key={s.label}
                className="rounded-2xl border border-white/[0.06] bg-[#15151f] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: s.delay }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wn-muted)]">{s.label}</p>
                <p className="font-display mt-2 text-2xl font-extrabold tabular-nums text-[var(--wn-fg)] sm:text-3xl">{s.val}</p>
                <p className={`mt-2 text-xs font-medium ${s.subClass}`}>{s.sub}</p>
              </motion.div>
            ))}
          </div>

          <motion.section
            className="rounded-2xl border border-white/[0.06] bg-[#15151f] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[var(--wn-fg)]">My Projects</h2>
              <Link className="text-xs font-bold text-[#6c63ff] hover:underline" to="/tasks">
                View Tasks
              </Link>
            </div>
            {myProjects.length === 0 ? (
              <p className="text-sm text-[var(--wn-muted)]">
                No projects yet.{' '}
                <Link to="/team" className="font-semibold text-[#6c63ff] hover:underline">
                  Create one from Team
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myProjects.map((proj) => {
                  const total = proj.taskTotal ?? 0
                  const done = proj.taskDone ?? 0
                  const pct = total ? Math.round((done / total) * 100) : 0
                  return (
                    <Link
                      key={proj._id}
                      to={`/projects/${proj._id}`}
                      className="group block rounded-xl border border-[color:var(--wn-border)] bg-[#12121a] p-4 transition hover:border-teal-500/30 hover:ring-1 hover:ring-teal-500/20"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-inner"
                          style={{ background: proj.color || '#14b8a6' }}
                        >
                          {(proj.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-display font-bold text-[var(--wn-fg)] group-hover:text-teal-300/90">{proj.name}</div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--wn-deep)]">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-[var(--wn-muted)]">
                            {done}/{total} tasks completed ({pct}%)
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </motion.section>

          <motion.div
            className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#15151f] shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between border-b border-[color:var(--wn-border)] px-5 py-4">
              <h2 className="font-display text-lg font-bold text-[var(--wn-fg)]">Recent Tasks</h2>
              <Link to="/tasks" className="text-xs font-bold text-[#6c63ff] hover:underline">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--wn-border)] bg-[#12121a]/80">
                    {['Task name', 'Priority', 'Status', 'Due date'].map((h) => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--wn-muted)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {loading ? (
                  <TableSkeleton rows={6} />
                ) : tableTasks.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-[var(--wn-muted)]">
                        No tasks yet. Use <strong className="text-[var(--wn-fg)]">Create New</strong> to add one.
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {tableTasks.map((t, i) => (
                      <motion.tr
                        key={t._id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-[color:var(--wn-border)] hover:bg-[var(--wn-hover)]"
                      >
                        <td className="max-w-[220px] truncate px-5 py-3 font-medium text-[var(--wn-fg)]">{t.title}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-0.5 text-[11px] font-bold capitalize ${priorityStyle(t.priority)}`}
                          >
                            {t.priority || 'medium'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusStyle(t.status)}`}
                          >
                            {statusLabel(t.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[var(--wn-muted)]">
                          {t.dueDate
                            ? new Date(t.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </motion.div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-white/[0.06]">
            <PomodoroTimer dashboardLayout />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <DashboardHeatmap tasks={tasks} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <QuickNotes notes={notes} />
            </motion.div>
          </div>
        </div>

        <aside className="min-h-[min(560px,calc(100vh-10rem))] xl:sticky xl:top-24">
          <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#15151f] shadow-xl">
            <AIPanel tasks={tasks} workspaceId={wid} variant="dock" />
          </div>
        </aside>
      </div>

      <TaskModal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        workspaceId={wid}
        projects={myProjects.map((p) => ({ _id: p._id, name: p.name, icon: p.icon }))}
        selectedProjectId={myProjects[0]?._id || ''}
        members={dashMembers}
        onSaved={() => {
          loadTasks()
          loadNotes()
        }}
      />
    </div>
  )
}
