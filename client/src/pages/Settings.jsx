import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import api from '../utils/api.js'

function wid() {
  return localStorage.getItem('workspaceId')
}

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const workspace = wid()
  const [name, setName] = useState(user?.name || '')
  const [workMin, setWorkMin] = useState(user?.pomodoroSettings?.workMinutes ?? 25)
  const [breakMin, setBreakMin] = useState(user?.pomodoroSettings?.breakMinutes ?? 5)
  const [longBreakMin, setLongBreakMin] = useState(user?.pomodoroSettings?.longBreakMinutes ?? 15)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  const saveProfile = async (e) => {
    e.preventDefault()
    await api.put('/users/profile', {
      name,
      pomodoroSettings: {
        workMinutes: Number(workMin),
        breakMinutes: Number(breakMin),
        longBreakMinutes: Number(longBreakMin),
      },
    })
    await refreshUser()
    setMessage('Profile saved')
  }

  const savePassword = async (e) => {
    e.preventDefault()
    await api.put('/users/profile', { currentPassword, newPassword })
    setCurrentPassword('')
    setNewPassword('')
    setMessage('Password updated')
  }

  const leaveWorkspace = async () => {
    if (!workspace || !confirm('Leave workspace?')) return
    await api.post(`/workspaces/${workspace}/leave`)
    localStorage.removeItem('workspaceId')
    window.location.reload()
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 pb-24">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">Settings</h1>
        <p className="mt-2 text-sm text-[var(--wn-muted)]">Profile, Pomodoro, and workspace safety</p>
      </motion.div>
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {message}
        </motion.p>
      )}
      <motion.section className="wn-card rounded-xl p-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <h2 className="mb-5 font-display text-lg font-bold text-[var(--wn-fg)]">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-[var(--wn-muted)]">Name</span>
            <input
              className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-[var(--wn-muted)]">Focus (min)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                value={workMin}
                onChange={(e) => setWorkMin(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-[var(--wn-muted)]">Short break (min)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                value={breakMin}
                onChange={(e) => setBreakMin(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-[var(--wn-muted)]">Long break (min)</span>
              <input
                type="number"
                className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                value={longBreakMin}
                onChange={(e) => setLongBreakMin(e.target.value)}
              />
            </label>
          </div>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            className="wn-btn rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] px-6 py-3 font-display font-bold text-white"
          >
            Save profile
          </motion.button>
        </form>
      </motion.section>
      <motion.section className="wn-card rounded-xl p-7" transition={{ delay: 0.08 }}>
        <h2 className="mb-5 font-display text-lg font-bold text-[var(--wn-fg)]">Password</h2>
        <form onSubmit={savePassword} className="space-y-4">
          <input
            type="password"
            placeholder="Current password"
            className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="New password"
            className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-muted)] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            className="rounded-xl bg-[var(--wn-panel)] px-6 py-3 font-bold text-[var(--wn-fg)] ring-1 ring-[color:var(--wn-ring-soft)]"
          >
            Change password
          </motion.button>
        </form>
      </motion.section>
      <motion.section className="wn-card rounded-xl p-7">
        <h2 className="mb-2 font-display text-lg font-bold text-[var(--wn-fg)]">Theme</h2>
        <p className="mb-4 text-sm text-[var(--wn-muted)]">Currently: {theme}</p>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          onClick={toggleTheme}
          className="rounded-xl border border-[color:var(--wn-border-strong)] px-5 py-2.5 font-semibold text-[var(--wn-fg)]"
        >
          Toggle dark/light
        </motion.button>
      </motion.section>
      {workspace && (
        <motion.section className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-7">
          <h2 className="mb-3 font-display text-lg font-bold text-rose-300">Danger zone</h2>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            onClick={leaveWorkspace}
            className="rounded-xl bg-rose-500 px-6 py-3 font-display font-bold text-white shadow-lg shadow-rose-900/40"
          >
            Leave workspace
          </motion.button>
        </motion.section>
      )}
    </div>
  )
}
