import { useMemo, useState, useEffect } from 'react'
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import api from '../utils/api.js'

function workspaceId() {
  return localStorage.getItem('workspaceId')
}

const PRIORITY_COLORS = ['#ef4444', '#f97316', '#34d399']

/** Tasks marked done whose updatedAt falls on this local calendar day */
function buildDailyCompletionsForMonth(tasks, year, monthIndex) {
  const monthLabel = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' })
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const out = []
  for (let d = 1; d <= lastDay; d += 1) {
    const dayStart = new Date(year, monthIndex, d, 0, 0, 0, 0)
    const dayEnd = new Date(year, monthIndex, d, 23, 59, 59, 999)
    const done = tasks.filter((t) => {
      if (t.status !== 'done') return false
      const u = t.updatedAt ? new Date(t.updatedAt) : null
      if (!u || Number.isNaN(u.getTime())) return false
      return u >= dayStart && u <= dayEnd
    }).length
    out.push({
      day: `${d} ${monthLabel}`,
      done,
    })
  }
  return out
}

export default function Reports() {
  const wsId = workspaceId()
  const [tasks, setTasks] = useState([])
  const [workspaceMeta, setWorkspaceMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!wsId) return
    let cancelled = false
    setLoading(true)
    Promise.all([api.get(`/tasks/${wsId}`), api.get(`/workspaces/${wsId}`)])
      .then(([tasksRes, wsRes]) => {
        if (cancelled) return
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : [])
        setWorkspaceMeta(wsRes.data || null)
      })
      .catch(() => {
        if (!cancelled) {
          setTasks([])
          setWorkspaceMeta(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [wsId])

  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'done').length
    const inProgress = tasks.filter((t) => t.status === 'inprogress').length
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length
    return [
      { label: 'Total Tasks', value: total },
      { label: 'Completed', value: completed },
      { label: 'In Progress', value: inProgress },
      { label: 'Overdue', value: overdue },
    ]
  }, [tasks])

  const completionRate = useMemo(() => {
    if (!tasks.length) return 0
    return Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)
  }, [tasks])

  const now = new Date()
  const reportYear = now.getFullYear()
  const reportMonth = now.getMonth()

  const lineData = useMemo(
    () => buildDailyCompletionsForMonth(tasks, reportYear, reportMonth),
    [tasks, reportYear, reportMonth]
  )

  const prioritySlices = useMemo(() => {
    const high = tasks.filter((t) => t.priority === 'high').length
    const medium = tasks.filter((t) => t.priority === 'medium').length
    const low = tasks.filter((t) => t.priority === 'low').length
    const total = high + medium + low
    if (!tasks.length || total === 0) return []
    return [
      { name: 'High', value: Math.round((high / total) * 100), count: high, color: PRIORITY_COLORS[0] },
      { name: 'Medium', value: Math.round((medium / total) * 100), count: medium, color: PRIORITY_COLORS[1] },
      { name: 'Low', value: Math.round((low / total) * 100), count: low, color: PRIORITY_COLORS[2] },
    ].filter((s) => s.count > 0)
  }, [tasks])

  const dateRangeLabel = useMemo(() => {
    const start = new Date(reportYear, reportMonth, 1)
    const end = new Date(reportYear, reportMonth + 1, 0)
    const opts = { month: 'long', day: 'numeric', year: 'numeric' }
    return `${start.toLocaleDateString(undefined, opts)} · ${end.toLocaleDateString(undefined, opts)}`
  }, [reportYear, reportMonth])

  if (!wsId) {
    return <p className="text-[var(--wn-muted)]">Select a workspace from Team.</p>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">Reports</h1>
        <p className="mt-1 text-sm text-[var(--wn-muted)]">
          {workspaceMeta?.name ? `${workspaceMeta.name} · ` : ''}
          {dateRangeLabel}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="wn-card wn-card-hover rounded-xl p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--wn-muted)]">{s.label}</div>
              <div className="mt-3 font-display text-3xl font-extrabold text-[var(--wn-fg)]">{s.value}</div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div
          className="wn-card rounded-xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="font-display mb-1 text-lg font-bold text-[var(--wn-fg)]">Tasks completed</h3>
          <p className="mb-4 text-xs text-[var(--wn-muted)]">
            By completion day (using last update time). Overall completion rate: {completionRate}%
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={lineData}>
              <defs>
                <linearGradient id="wnPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6c63ff" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#6c63ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--wn-border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--wn-muted)" tick={{ fontSize: 9 }} interval={6} />
              <YAxis stroke="var(--wn-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--wn-panel)',
                  border: '1px solid var(--wn-border-strong)',
                  borderRadius: '12px',
                  color: 'var(--wn-fg)',
                }}
              />
              <Area type="monotone" dataKey="done" stroke="#6c63ff" strokeWidth={2} fillOpacity={1} fill="url(#wnPurple)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="wn-card rounded-xl p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <h3 className="font-display mb-4 text-lg font-bold text-[var(--wn-fg)]">Tasks by priority</h3>
          {prioritySlices.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-[var(--wn-muted)]">
              No tasks yet — priority breakdown will appear once you add tasks.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={prioritySlices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={104}
                    paddingAngle={3}
                  >
                    {prioritySlices.map((entry, idx) => (
                      <Cell key={entry.name} fill={entry.color || PRIORITY_COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name, p) => {
                      const c = p?.payload?.count
                      return [`${v}%${c != null ? ` (${c} tasks)` : ''}`, name]
                    }}
                    contentStyle={{
                      background: 'var(--wn-panel)',
                      border: '1px solid var(--wn-border-strong)',
                      borderRadius: '12px',
                      color: 'var(--wn-fg)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs font-semibold">
                {prioritySlices.map((p) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-[var(--wn-muted)]">{p.name}</span>
                    <span className="text-[var(--wn-fg)]">
                      {p.value}% · {p.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
