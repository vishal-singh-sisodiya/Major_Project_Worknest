import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useAuth } from '../../context/AuthContext.jsx'
import { toastSuccess } from '../../utils/toast.js'

export function PomodoroTimer() {
  const { user } = useAuth()
  const workSec = (user?.pomodoroSettings?.workMinutes ?? 25) * 60
  const breakSec = (user?.pomodoroSettings?.breakMinutes ?? 5) * 60
  const [mode, setMode] = useState('work')
  const [remaining, setRemaining] = useState(workSec)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(0)

  const total = mode === 'work' ? workSec : breakSec
  const progress = 1 - remaining / total
  const circumference = 2 * Math.PI * 45
  const offset = circumference * (1 - progress)

  const tick = useCallback(() => {
    setRemaining((r) => {
      if (r <= 1) {
        setRunning(false)
        if (mode === 'work') {
          setCompleted((c) => c + 1)
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 }, colors: ['#6c63ff', '#34d399'] })
          toastSuccess('Session complete — break time! 🎉')
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('WorkNest', { body: 'Work session done. Break time.' })
          }
          setMode('break')
          return breakSec
        }
        toastSuccess('Break over — back to grind 💪')
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('WorkNest', { body: 'Break over.' })
        }
        setMode('work')
        return workSec
      }
      return r - 1
    })
  }, [mode, workSec, breakSec])

  useEffect(() => {
    if (!running) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [running, tick])

  useEffect(() => {
    setRemaining(mode === 'work' ? workSec : breakSec)
  }, [mode, workSec, breakSec])

  const format = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      className={`glass-card rounded-xl p-4 ${running ? 'pulse-glow-running' : ''}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
    >
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28">
          <svg className="-rotate-90" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="pomodoro-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6c63ff" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#pomodoro-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.35s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-lg font-bold text-[#e8eaf0]">{format(remaining)}</span>
            <span className="text-xs text-[#7a7f94]">{mode === 'work' ? 'Work' : 'Break'}</span>
          </div>
        </div>
        <div>
          <div className="text-sm text-[#7a7f94]">Sessions</div>
          <div className="font-display text-2xl font-bold text-[#6c63ff]">{completed}</div>
          <div className="mt-2 flex gap-2">
            <motion.button
              type="button"
              onClick={() => setRunning(!running)}
              className="btn-interactive rounded-lg bg-[#6c63ff] px-3 py-1 text-sm text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {running ? 'Pause' : 'Start'}
            </motion.button>
            {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
              <motion.button
                type="button"
                onClick={() => Notification.requestPermission()}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-[#7a7f94]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Notify
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
