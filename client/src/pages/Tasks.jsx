import { useState, useEffect, useMemo } from 'react'
import { TaskModal } from '../components/tasks/TaskModal.jsx'
import api from '../utils/api.js'

function wid() {
  return localStorage.getItem('workspaceId')
}

export default function Tasks() {
  const workspace = wid()
  const [tasks, setTasks] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')

  const load = async () => {
    if (!workspace) return
    const { data } = await api.get(`/tasks/${workspace}`)
    setTasks(data)
  }

  useEffect(() => {
    load()
  }, [workspace])

  const filtered = useMemo(() => {
    let list = [...tasks]
    if (status !== 'all') list = list.filter((t) => t.status === status)
    if (priority !== 'all') list = list.filter((t) => t.priority === priority)
    return list
  }, [tasks, status, priority])

  if (!workspace) {
    return <p className="text-[#7a7f94]">Select a workspace from Team.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-[#e8eaf0]">Tasks</h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          className="rounded-xl bg-[#6c63ff] px-4 py-2 text-sm text-white"
        >
          Create task
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-xl border border-white/10 bg-[#1a1e28] px-3 py-2 text-sm text-[#e8eaf0]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="todo">To Do</option>
          <option value="inprogress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select
          className="rounded-xl border border-white/10 bg-[#1a1e28] px-3 py-2 text-sm text-[#e8eaf0]"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <ul className="space-y-2">
        {filtered.map((t) => (
          <li
            key={t._id}
            className="cursor-pointer rounded-xl border border-white/10 bg-[#1a1e28] p-4 hover:bg-white/5"
            onClick={() => {
              setEditing(t)
              setModalOpen(true)
            }}
          >
            <div className="font-medium text-[#e8eaf0]">{t.title}</div>
            <div className="text-xs text-[#7a7f94]">
              {t.status} · {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}
            </div>
          </li>
        ))}
      </ul>
      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={workspace}
        task={editing}
        onSaved={load}
      />
    </div>
  )
}
