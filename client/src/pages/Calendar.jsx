import { useState, useEffect, useMemo } from 'react'
import { TaskModal } from '../components/tasks/TaskModal.jsx'
import api from '../utils/api.js'

function wid() {
  return localStorage.getItem('workspaceId')
}

export default function Calendar() {
  const workspace = wid()
  const [tasks, setTasks] = useState([])
  const [taskModal, setTaskModal] = useState(false)
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    if (!workspace) return
    api.get(`/tasks/${workspace}`).then(({ data }) => setTasks(data))
  }, [workspace])

  const byDate = useMemo(() => {
    const map = {}
    for (const t of tasks) {
      if (!t.dueDate) continue
      const d = String(t.dueDate).slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(t)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [tasks])

  if (!workspace) {
    return <p className="text-[#7a7f94]">Select a workspace from Team.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-[#e8eaf0]">Calendar</h1>
        <button
          type="button"
          onClick={() => {
            setDueDate(new Date().toISOString().slice(0, 10))
            setTaskModal(true)
          }}
          className="rounded-xl bg-[#6c63ff] px-4 py-2 text-sm text-white"
        >
          New task with due date
        </button>
      </div>
      <p className="text-sm text-[#7a7f94]">
        Tasks grouped by due date. Install @fullcalendar/timegrid and fix CSS exports for a full calendar UI.
      </p>
      <div className="space-y-4">
        {byDate.length === 0 && (
          <p className="text-[#7a7f94]">No tasks with due dates yet.</p>
        )}
        {byDate.map(([date, list]) => (
          <div
            key={date}
            className="rounded-xl border border-white/10 bg-[#1a1e28] p-4"
          >
            <div className="font-display font-semibold text-[#6c63ff]">{date}</div>
            <ul className="mt-2 space-y-1">
              {list.map((t) => (
                <li key={t._id} className="text-sm text-[#e8eaf0]">
                  {t.title} — <span className="text-[#7a7f94]">{t.status}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
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
          api.get(`/tasks/${workspace}`).then(({ data }) => setTasks(data))
        }}
      />
    </div>
  )
}
