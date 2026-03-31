import { Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from './context/AuthContext.jsx'
import { Layout } from './components/layout/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import Notes from './pages/Notes.jsx'
import Calendar from './pages/Calendar.jsx'
import Goals from './pages/Goals.jsx'
import Team from './pages/Team.jsx'
import Chat from './pages/Chat.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import { useEffect, useState } from 'react'
import api from './utils/api.js'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0f14]">
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-[#6c63ff] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  const [workspaceName, setWorkspaceName] = useState('')

  useEffect(() => {
    if (!user) return
    const wid = localStorage.getItem('workspaceId')
    if (wid) {
      api.get(`/workspaces/${wid}`).then(({ data }) => setWorkspaceName(data.name)).catch(() => {})
    } else {
      api.get('/workspaces/my').then(({ data }) => {
        if (data[0]) {
          localStorage.setItem('workspaceId', data[0]._id)
          setWorkspaceName(data[0].name)
        }
      })
    }
  }, [user])

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout workspaceName={workspaceName} />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="notes" element={<Notes />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="goals" element={<Goals />} />
        <Route path="team" element={<Team />} />
        <Route path="chat" element={<Chat />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
