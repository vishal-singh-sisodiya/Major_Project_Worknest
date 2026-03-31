import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../utils/api.js'

function wid() {
  return localStorage.getItem('workspaceId')
}

const STORAGE_KEY = 'worknest_goals'

export default function Goals() {
  const workspace = wid()
  const [goals, setGoals] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const loadLocal = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const all = raw ? JSON.parse(raw) : {}
      setGoals(all[workspace] || [])
    } catch {
      setGoals([])
    }
  }

  const saveLocal = (list) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const all = raw ? JSON.parse(raw) : {}
      all[workspace] = list
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!workspace) return
    api
      .get(`/goals/workspace/${workspace}`)
      .then(({ data }) => setGoals(Array.isArray(data) ? data : []))
      .catch(() => loadLocal())
  }, [workspace])

  const create = (e) => {
    e.preventDefault()
    if (!title.trim() || !workspace) return
    const g = {
      _id: `local-${Date.now()}`,
      title: title.trim(),
      description,
      progress: 0,
      completed: false,
    }
    const next = [...goals, g]
    setGoals(next)
    saveLocal(next)
    setTitle('')
    setDescription('')
  }

  const updateProgress = (g, progress) => {
    const next = goals.map((x) =>
      x._id === g._id ? { ...x, progress } : x
    )
    setGoals(next)
    saveLocal(next)
  }

  const toggleComplete = (g) => {
    const next = goals.map((x) =>
      x._id === g._id ? { ...x, completed: !x.completed } : x
    )
    setGoals(next)
    saveLocal(next)
  }

  if (!workspace) {
    return <p className="text-[#7a7f94]">Select a workspace from Team.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[#e8eaf0]">Goals</h1>
      <form
        onSubmit={create}
        className="glass-card flex flex-wrap gap-3 rounded-xl p-4"
      >
        <input
          placeholder="Title"
          className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-[#13161d] px-4 py-2 text-[#e8eaf0]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Description"
          className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-[#13161d] px-4 py-2 text-[#e8eaf0]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-[#6c63ff] px-4 py-2 text-white"
        >
          Add goal
        </button>
      </form>
      <ul className="space-y-4">
        {goals.map((g) => (
          <motion.li
            key={g._id}
            className="glass-card rounded-xl p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-[#e8eaf0]">{g.title}</div>
                <div className="text-sm text-[#7a7f94]">{g.description}</div>
              </div>
              <button
                type="button"
                onClick={() => toggleComplete(g)}
                className="rounded-xl border border-white/10 px-3 py-1 text-sm text-[#e8eaf0]"
              >
                {g.completed ? 'Reopen' : 'Complete'}
              </button>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-[#7a7f94]">
                <span>Progress</span>
                <span>{g.progress ?? 0}%</span>
              </div>
              <div className="mb-1 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[#6c63ff]"
                  initial={{ width: 0 }}
                  animate={{ width: `${g.progress ?? 0}%` }}
                  transition={{ duration: 0.8, ease: [0.175, 0.885, 0.32, 1.275] }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={g.progress ?? 0}
                onChange={(e) => updateProgress(g, Number(e.target.value))}
                className="w-full accent-[#6c63ff]"
              />
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
