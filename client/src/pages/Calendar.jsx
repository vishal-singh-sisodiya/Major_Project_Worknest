import { useState, useEffect, useMemo } from 'react'
import { TaskModal } from '../components/tasks/TaskModal.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../utils/api.js'

function wid() {
  return localStorage.getItem('workspaceId')
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Static demos + task due dates layered on calendar (May 2026 baseline). */
const STATIC_EVENTS = [
  { title: 'Team Sync', date: '2026-05-06', hue: 'purple' },
  { title: 'Design Review', date: '2026-05-06', hue: 'purple' },
  { title: 'Project Deadline', date: '2026-05-12', hue: 'blue' },
  { title: 'Client Call', date: '2026-05-18', hue: 'orange' },
  { title: 'Workshop', date: '2026-05-22', hue: 'orange' },
  { title: 'Monthly Report', date: '2026-05-28', hue: 'green' },
]

const hueClasses = {
  purple: 'bg-[#6c63ff]/90 border-[#8b5cf6]/60 text-white',
  blue: 'bg-blue-500/90 border-blue-400/50 text-white',
  orange: 'bg-amber-500/90 border-amber-400/50 text-white',
  green: 'bg-emerald-500/90 border-emerald-400/55 text-white',
}

function padKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function Calendar() {
  const workspace = wid()
  const [tasks, setTasks] = useState([])
  const [taskModal, setTaskModal] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(() => new Date(2026, 4, 1))

  useEffect(() => {
    if (!workspace) return
    api.get(`/tasks/${workspace}`).then(({ data }) => setTasks(data))
  }, [workspace])

  const reloadTasks = () => {
    if (!workspace) return
    api.get(`/tasks/${workspace}`).then(({ data }) => setTasks(data))
  }

  const eventsByDay = useMemo(() => {
    const map = {}
    for (const ev of STATIC_EVENTS) {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push({ ...ev, kind: 'static' })
    }
    for (const t of tasks) {
      if (!t.dueDate) continue
      const ds = String(t.dueDate).slice(0, 10)
      if (!map[ds]) map[ds] = []
      let hue = 'purple'
      if (t.priority === 'high') hue = 'orange'
      else if (t.priority === 'medium') hue = 'blue'
      else if (t.priority === 'low') hue = 'green'
      map[ds].push({ title: t.title, hue, kind: 'task', date: ds })
    }
    return map
  }, [tasks])

  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const dim = new Date(y, m + 1, 0).getDate()
  const firstDow = new Date(y, m, 1).getDay()
  const today = new Date()

  const goPrev = () => setCursor(new Date(y, m - 1, 1))
  const goNext = () => setCursor(new Date(y, m + 1, 1))
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const gridCells = useMemo(() => {
    const cells = []
    let d = 1 - firstDow
    while (d <= dim) {
      const row = []
      for (let i = 0; i < 7; i++) {
        row.push(d)
        d++
      }
      cells.push(row)
    }
    return cells
  }, [firstDow, dim])

  const startOfWeek = useMemo(() => {
    const t = new Date()
    const dow = t.getDay()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() - dow)
  }, [])

  if (!workspace) {
    return <p className="text-[var(--wn-muted)]">Select a workspace from Team.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">Calendar</h1>
          <p className="mt-1 text-sm text-[var(--wn-muted)]">View and manage your schedule</p>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(108,99,255,0.4)' }}
          whileTap={{ scale: 0.98 }}
          className="wn-btn rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-5 py-2.5 font-display font-bold text-white"
          onClick={() => {
            setDueDate(new Date().toISOString().slice(0, 10))
            setTaskModal(true)
          }}
        >
          + New Event
        </motion.button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] p-1">
          {['month', 'week', 'day'].map((v) => (
            <motion.button
              key={v}
              type="button"
              whileHover={{ scale: 1.02 }}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-2 text-xs font-bold capitalize ${
                view === v ? 'bg-[#6c63ff] text-white shadow-lg' : 'text-[var(--wn-muted)]'
              }`}
            >
              {v}
            </motion.button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] p-2 text-[var(--wn-fg)]"
            onClick={goPrev}
          >
            ←
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] px-5 py-2 font-display font-bold text-[var(--wn-fg)]"
            onClick={goToday}
          >
            Today
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] p-2 text-[var(--wn-fg)]"
            onClick={goNext}
          >
            →
          </motion.button>
        </div>
      </div>

      <div className="wn-card rounded-xl p-4 sm:p-6">
        <div className="mb-6 text-center font-display text-xl font-bold text-[var(--wn-fg)]">
          {MONTHS[m]} {y}
        </div>

        <AnimatePresence mode="wait">
          {view === 'month' && (
            <motion.div
              key="month"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-[var(--wn-muted)]">
                {weekDays.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid gap-1">
                {gridCells.map((row, ri) => (
                  <div className="grid grid-cols-7 gap-1" key={ri}>
                    {row.map((dayNum, wi) =>
                      dayNum < 1 || dayNum > dim ? (
                        <div key={`e-${ri}-${wi}`} className="min-h-[100px] rounded-lg bg-white/[0.02]" />
                      ) : (
                        <motion.div
                          key={dayNum}
                          className="min-h-[100px] rounded-lg border border-[color:var(--wn-border)] bg-[var(--wn-deep-a60)] p-1.5"
                          whileHover={{ y: -2, borderColor: 'rgba(108,99,255,0.35)' }}
                        >
                          <div
                            className={`text-xs font-bold ${
                              today.getFullYear() === y && today.getMonth() === m && today.getDate() === dayNum
                                ? 'inline-flex rounded-md bg-[#6c63ff] px-1.5 py-0.5 text-white'
                                : 'text-[var(--wn-fg)]'
                            }`}
                          >
                            {dayNum}
                          </div>
                          <div className="mt-1 space-y-1">
                            {(eventsByDay[padKey(y, m, dayNum)] || []).slice(0, 4).map((ev, i) => (
                              <div
                                key={`${ev.title}-${i}`}
                                className={`truncate rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ${hueClasses[ev.hue] || hueClasses.purple}`}
                              >
                                {ev.title}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'week' && (
            <motion.div
              key="week"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid gap-2 sm:grid-cols-7"
            >
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i)
                const key = padKey(d.getFullYear(), d.getMonth(), d.getDate())
                return (
                  <div key={key} className="wn-card rounded-xl p-3">
                    <div className="text-center text-[11px] font-bold uppercase text-[var(--wn-muted)]">
                      {weekDays[d.getDay()]}
                    </div>
                    <div className="text-center font-display text-lg font-extrabold text-[var(--wn-fg)]">{d.getDate()}</div>
                    <div className="mt-3 space-y-1">
                      {(eventsByDay[key] || []).map((ev, j) => (
                        <div
                          key={`${ev.title}-${j}`}
                          className={`truncate rounded-lg border px-2 py-1 text-[10px] font-semibold ${hueClasses[ev.hue] || hueClasses.purple}`}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {view === 'day' && (
            <motion.div
              key="day"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="mb-4 text-[var(--wn-muted)]">
                Showing {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="mx-auto max-w-lg space-y-2 text-left">
                {(eventsByDay[padKey(today.getFullYear(), today.getMonth(), today.getDate())] || []).length === 0 && (
                  <p className="text-center text-[var(--wn-muted)]">No events today — breathe and plan.</p>
                )}
                {(eventsByDay[padKey(today.getFullYear(), today.getMonth(), today.getDate())] || []).map((ev, i) => (
                  <motion.div
                    key={`${ev.title}-${i}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`rounded-xl border px-4 py-3 font-semibold ${hueClasses[ev.hue] || hueClasses.purple}`}
                  >
                    {ev.title}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-center text-xs text-[var(--wn-muted)]">
        Task due dates merge with roadmap events (May 2026 reference month). Toggle views to skim your week or today.
      </p>

      <TaskModal
        open={taskModal}
        onClose={() => {
          setTaskModal(false)
          setDueDate('')
        }}
        workspaceId={workspace}
        defaultDueDate={dueDate || undefined}
        onSaved={() => {
          setTaskModal(false)
          reloadTasks()
        }}
      />
    </div>
  )
}
