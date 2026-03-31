import { useState } from 'react'
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
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  const saveProfile = async (e) => {
    e.preventDefault()
    await api.put('/users/profile', {
      name,
      pomodoroSettings: { workMinutes: Number(workMin), breakMinutes: Number(breakMin) },
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
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="font-display text-2xl font-bold text-[#e8eaf0]">Settings</h1>
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      <section className="rounded-xl border border-white/10 bg-[#1a1e28] p-6">
        <h2 className="mb-4 font-display text-lg text-[#e8eaf0]">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-[#7a7f94]">Name</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-[#13161d] px-4 py-2 text-[#e8eaf0]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-[#7a7f94]">Work min</span>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-[#13161d] px-4 py-2 text-[#e8eaf0]"
                value={workMin}
                onChange={(e) => setWorkMin(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[#7a7f94]">Break min</span>
              <input
                type="number"
                className="w-full rounded-xl border border-white/10 bg-[#13161d] px-4 py-2 text-[#e8eaf0]"
                value={breakMin}
                onChange={(e) => setBreakMin(e.target.value)}
              />
            </label>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[#6c63ff] px-4 py-2 text-white"
          >
            Save profile
          </button>
        </form>
      </section>
      <section className="rounded-xl border border-white/10 bg-[#1a1e28] p-6">
        <h2 className="mb-4 font-display text-lg text-[#e8eaf0]">Password</h2>
        <form onSubmit={savePassword} className="space-y-4">
          <input
            type="password"
            placeholder="Current password"
            className="w-full rounded-xl border border-white/10 bg-[#13161d] px-4 py-2 text-[#e8eaf0]"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="New password"
            className="w-full rounded-xl border border-white/10 bg-[#13161d] px-4 py-2 text-[#e8eaf0]"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="submit" className="rounded-xl bg-[#6c63ff] px-4 py-2 text-white">
            Change password
          </button>
        </form>
      </section>
      <section className="rounded-xl border border-white/10 bg-[#1a1e28] p-6">
        <h2 className="mb-4 font-display text-lg text-[#e8eaf0]">Theme</h2>
        <p className="mb-2 text-sm text-[#7a7f94]">Current: {theme}</p>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl border border-white/10 px-4 py-2 text-[#e8eaf0]"
        >
          Toggle dark/light
        </button>
      </section>
      {workspace && (
        <section className="rounded-xl border border-rose-500/30 bg-[#1a1e28] p-6">
          <h2 className="mb-4 font-display text-lg text-rose-400">Danger zone</h2>
          <button
            type="button"
            onClick={leaveWorkspace}
            className="rounded-xl bg-rose-500/80 px-4 py-2 text-white"
          >
            Leave workspace
          </button>
        </section>
      )}
    </div>
  )
}
