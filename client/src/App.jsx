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
import Team from './pages/Team.jsx'
import Chat from './pages/Chat.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import { useCallback, useEffect, useState } from 'react'
import api from './utils/api.js'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--wn-bg)]">
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
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => localStorage.getItem('workspaceId') || '')

  const activateWorkspaceInClient = useCallback((ws) => {
    if (!ws?._id) return
    localStorage.setItem('workspaceId', String(ws._id))
    localStorage.removeItem('worknest_projectId')
    setActiveWorkspaceId(String(ws._id))
    const name = typeof ws.name === 'string' ? ws.name : ''
    setWorkspaceName(name || 'Workspace')
  }, [])

  const hydrateWorkspaceFromApi = useCallback(() => {
    if (!user) return

    const pickFirst = (list) => {
      if (!list?.length) return
      const first = list[0]
      localStorage.setItem('workspaceId', String(first._id))
      localStorage.removeItem('worknest_projectId')
      setActiveWorkspaceId(String(first._id))
      setWorkspaceName(first.name || 'Workspace')
    }

    const wid = localStorage.getItem('workspaceId')
    if (wid) {
      api
        .get(`/workspaces/${wid}`)
        .then(({ data }) => {
          setWorkspaceName(data?.name || 'Workspace')
          setActiveWorkspaceId(String(wid))
        })
        .catch(() => {
          localStorage.removeItem('workspaceId')
          api.get('/workspaces/my').then(({ data }) => pickFirst(Array.isArray(data) ? data : []))
        })
    } else {
      api.get('/workspaces/my').then(({ data }) => pickFirst(Array.isArray(data) ? data : []))
    }
  }, [user])

  useEffect(() => {
    hydrateWorkspaceFromApi()
  }, [hydrateWorkspaceFromApi])

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout
              workspaceName={workspaceName}
              activeWorkspaceId={activeWorkspaceId}
              onWorkspaceActivate={activateWorkspaceInClient}
            />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="notes" element={<Notes />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="team" element={<Team />} />
        <Route path="chat" element={<Chat />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
