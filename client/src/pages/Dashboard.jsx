import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { KanbanBoard } from '../components/kanban/KanbanBoard.jsx'
import { AIPanel } from '../components/ai/AIPanel.jsx'
import { PomodoroTimer } from '../components/pomodoro/PomodoroTimer.jsx'
import { TaskModal } from '../components/tasks/TaskModal.jsx'
import api from '../utils/api.js'
import { useSocket } from '../context/SocketContext.jsx'

function workspaceId() {
  return localStorage.getItem('workspaceId')
}

const VIBES = [
  { id: 'grind', emoji: '😤', label: 'Grind', glow: 'rgba(244,63,94,0.25)' },
  { id: 'zone', emoji: '🔥', label: 'In the zone', glow: 'rgba(251,146,60,0.25)' },
  { id: 'low', emoji: '😴', label: 'Low energy', glow: 'rgba(108,99,255,0.2)' },
  { id: 'stress', emoji: '😰', label: 'Stressed', glow: 'rgba(139,92,246,0.25)' },
]

function useCountUp(end, duration = 800) {
  const [n, setN] = useState(0)
  const startRef = useRef(null)
  useEffect(() => {
    startRef.current = null
    const step = (t) => {
      if (!startRef.current) startRef.current = t
      const p = Math.min((t - startRef.current) / duration, 1)
      const eased = 1 - (1 - p) ** 3
      setN(Math.round(eased * end))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration])
  return n
}

function streakDays() {
  const key = 'worknest_streak'
  const last = localStorage.getItem(key + '_last')
  const count = Number(localStorage.getItem(key) || 0)
  const today = new Date().toDateString()
  if (last === today) return count
  const yesterday = new Date(Date.now() - 864e5).toDateString()
  if (last === yesterday) {
    localStorage.setItem(key, String(count + 1))
    localStorage.setItem(key + '_last', today)
    return count + 1
  }
  localStorage.setItem(key, '1')
  localStorage.setItem(key + '_last', today)
  return 1
}

export default function Dashboard() {
  const wid = workspaceId()
  const [tasks, setTasks] = useState([])
  const [taskModal, setTaskModal] = useState(false)
  const [vibe, setVibe] = useState(VIBES[1])
  const { socket, joinWorkspace } = useSocket()

  const loadTasks = async () => {
    if (!wid) return
    try {
      const { data } = await api.get(`/tasks/${wid}`)
      setTasks(data)
    } catch {
      setTasks([])
    }
  }

  useEffect(() => {
    loadTasks()
  }, [wid])

  useEffect(() => {
    if (!wid) return
    joinWorkspace(wid)
    const onMoved = () => loadTasks()
    socket?.on('task-moved', onMoved)
    return () => socket?.off('task-moved', onMoved)
  }, [wid, socket, joinWorkspace])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'GM ☀️' : hour < 18 ? 'Hey ✨' : 'GN 🌙'
  const streak = streakDays()

  const completed = tasks.filter((t) => t.status === 'done').length
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  ).length

  const countTotal = useCountUp(tasks.length)
  const countDone = useCountUp(completed)
  const countOverdue = useCountUp(overdue)

  if (!wid) {
    return (
      <motion.p
        className="text-[#7a7f94]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Open <strong className="text-[#6c63ff]">Team</strong> and select a workspace first.
      </motion.p>
    )
  }

  return (
    <motion.div
      className="space-y-6 rounded-2xl p-1"
      style={{ boxShadow: `0 0 60px ${vibe.glow}` }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <motion.h1
            className="font-display text-2xl font-bold text-[#e8eaf0]"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {greeting} <span className="text-[#6c63ff]">Dashboard</span>
          </motion.h1>
          <p className="text-sm text-[#7a7f94]">
            🔥 {streak} day streak · Vibe check —
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <motion.button
                key={v.id}
                type="button"
                onClick={() => setVibe(v)}
                className={`rounded-xl border px-3 py-1 text-xs transition ${
                  vibe.id === v.id
                    ? 'border-[#6c63ff] bg-[#6c63ff]/20 text-[#e8eaf0]'
                    : 'border-white/10 bg-white/5 text-[#7a7f94] hover:border-white/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {v.emoji} {v.label}
              </motion.button>
            ))}
          </div>
        </div>
        <motion.button
          type="button"
          onClick={() => setTaskModal(true)}
          className="btn-interactive rounded-xl bg-[#6c63ff] px-4 py-2 text-sm font-medium text-white"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          New task
        </motion.button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ['Total tasks', countTotal],
          ['Completed', countDone],
          ['Overdue', countOverdue],
        ].map(([label, val], i) => (
          <motion.div
            key={label}
            className="glass-card rounded-xl p-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <div className="text-sm text-[#7a7f94]">{label}</div>
            <div className="font-display text-2xl font-bold text-[#6c63ff]">{val}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <KanbanBoard workspaceId={wid} tasks={tasks} setTasks={setTasks} />
          <PomodoroTimer />
        </div>
        <AIPanel tasks={tasks} />
      </div>

      <TaskModal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        workspaceId={wid}
        onSaved={loadTasks}
      />
    </motion.div>
  )
}
