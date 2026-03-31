import { useState, useEffect } from 'react'
import api from '../../utils/api.js'

export function TaskModal({ open, onClose, workspaceId, task, onSaved, defaultDueDate }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('todo')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (task && task._id) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setPriority(task.priority || 'medium')
      setStatus(task.status || 'todo')
      setDueDate(task.dueDate ? String(task.dueDate).slice(0, 10) : '')
      setTags((task.tags || []).join(', '))
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setStatus('todo')
      setDueDate(defaultDueDate ? defaultDueDate.slice(0, 10) : '')
      setTags('')
    }
  }, [task, open, defaultDueDate])

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !workspaceId) return
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
      }
      if (task && task._id) {
        await api.put(`/tasks/${task._id}`, payload)
      } else {
        await api.post('/tasks', payload)
      }
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-lg rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display mb-4 text-xl font-semibold text-[#e8eaf0]">
          {task && task._id ? 'Edit task' : 'New task'}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-[#7a7f94]">Title</span>
            <input
              required
              className="w-full rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[#7a7f94]">Description</span>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-[#7a7f94]">Priority</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[#7a7f94]">Status</span>
              <select
                className="w-full rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm text-[#7a7f94]">Due date</span>
            <input
              type="date"
              className="w-full rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[#7a7f94]">Tags (comma separated)</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-[#e8eaf0] hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#6c63ff] px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
