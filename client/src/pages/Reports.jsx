import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { useState, useEffect } from 'react'
import api from '../utils/api.js'

function wid() {
  return localStorage.getItem('workspaceId')
}

const COLORS = ['#6c63ff', '#f43f5e', '#34d399', '#f59e0b']

export default function Reports() {
  const workspace = wid()
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    if (!workspace) return
    api.get(`/tasks/${workspace}`).then(({ data }) => setTasks(data))
  }, [workspace])

  const weeklyData = useMemo(
    () => [
      { name: 'W1', completed: tasks.filter((t) => t.status === 'done').length },
      { name: 'W2', completed: Math.max(1, Math.floor(tasks.length * 0.2)) },
      { name: 'W3', completed: Math.max(1, Math.floor(tasks.length * 0.4)) },
      { name: 'W4', completed: tasks.filter((t) => t.status === 'done').length },
    ],
    [tasks]
  )

  const statusData = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length
    const prog = tasks.filter((t) => t.status === 'inprogress').length
    const done = tasks.filter((t) => t.status === 'done').length
    return [
      { name: 'To Do', value: todo || 1 },
      { name: 'In Progress', value: prog || 1 },
      { name: 'Done', value: done || 1 },
    ]
  }, [tasks])

  if (!workspace) {
    return <p className="text-[#7a7f94]">Select a workspace from Team.</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-[#e8eaf0]">Reports</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#1a1e28] p-4">
          <h4 className="mb-2 font-display text-sm font-semibold text-[#e8eaf0]">
            Tasks completed (sample weeks)
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#7a7f94" />
              <YAxis stroke="#7a7f94" />
              <Tooltip
                contentStyle={{ background: '#13161d', border: '1px solid #333', color: '#e8eaf0' }}
              />
              <Bar dataKey="completed" fill="#6c63ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1a1e28] p-4">
          <h4 className="mb-2 font-display text-sm font-semibold text-[#e8eaf0]">
            Status distribution
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
