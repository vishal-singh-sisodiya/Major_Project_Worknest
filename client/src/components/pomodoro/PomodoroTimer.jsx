import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useAuth } from '../../context/AuthContext.jsx'
import api from '../../utils/api.js'
import { toastError, toastSuccess } from '../../utils/toast.js'

const MIN_MIN = 1
const MAX_MIN = 180
const MAX_DOTS = 48

const TABS = [
  { id: 'pomodoro', label: 'Pomodoro' },
  { id: 'shortBreak', label: 'Short Break' },
  { id: 'longBreak', label: 'Long Break' },
]

const ACCENT = '#d95550'
const ACCENT_SOFT = 'rgba(217, 85, 80, 0.45)'

function clampMin(n) {
  if (!Number.isFinite(n)) return null
  return Math.min(MAX_MIN, Math.max(MIN_MIN, Math.round(n)))
}

function secondsForPreset(preset, workS, shortS, longS) {
  if (preset === 'pomodoro') return workS
  if (preset === 'shortBreak') return shortS
  return longS
}

export function PomodoroTimer({ dashboardLayout = false } = {}) {
  const { user, refreshUser } = useAuth()
  const pw = user?.pomodoroSettings?.workMinutes ?? 25
  const ps = user?.pomodoroSettings?.breakMinutes ?? 5
  const pl = user?.pomodoroSettings?.longBreakMinutes ?? 15

  const [sessionWorkMin, setSessionWorkMin] = useState(pw)
  const [sessionShortMin, setSessionShortMin] = useState(ps)
  const [sessionLongMin, setSessionLongMin] = useState(pl)
  const [preset, setPreset] = useState('pomodoro')
  const [remaining, setRemaining] = useState(pw * 60)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draftWork, setDraftWork] = useState(String(pw))
  const [draftShort, setDraftShort] = useState(String(ps))
  const [draftLong, setDraftLong] = useState(String(pl))
  const [savingSettings, setSavingSettings] = useState(false)

  const lastSettingsKey = useRef('')
  const presetRef = useRef(preset)
  const completePhaseRef = useRef(null)

  useEffect(() => {
    presetRef.current = preset
  }, [preset])

  const workS = sessionWorkMin * 60
  const shortS = sessionShortMin * 60
  const longS = sessionLongMin * 60

  useEffect(() => {
    const key = `${pw}-${ps}-${pl}`
    if (lastSettingsKey.current === key) return
    lastSettingsKey.current = key
    if (running || settingsOpen) return
    setSessionWorkMin(pw)
    setSessionShortMin(ps)
    setSessionLongMin(pl)
    setRemaining(secondsForPreset(preset, pw * 60, ps * 60, pl * 60))
  }, [pw, ps, pl, running, settingsOpen, preset])

  const completePhase = useCallback(() => {
    const p = presetRef.current
    setRunning(false)
    if (p === 'pomodoro') {
      setCompleted((c) => c + 1)
      confetti({
        particleCount: 72,
        spread: 62,
        origin: { y: 0.55 },
        colors: [ACCENT, '#eef2ff', '#f87171'],
      })
      toastSuccess('Session complete — short break!')
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('WorkNest', { body: 'Work session done. Take a short break.' })
      }
      presetRef.current = 'shortBreak'
      setPreset('shortBreak')
      setRemaining(sessionShortMin * 60)
      return
    }
    toastSuccess('Break over — back to focus')
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('WorkNest', { body: 'Break over.' })
    }
    presetRef.current = 'pomodoro'
    setPreset('pomodoro')
    setRemaining(sessionWorkMin * 60)
  }, [sessionShortMin, sessionWorkMin])

  useEffect(() => {
    completePhaseRef.current = completePhase
  }, [completePhase])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 0) return prev
        const next = prev - 1
        if (next <= 0 && completePhaseRef.current) {
          completePhaseRef.current()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const selectPreset = (id) => {
    if (preset === id) return
    setRunning(false)
    presetRef.current = id
    setPreset(id)
    setRemaining(secondsForPreset(id, workS, shortS, longS))
  }

  const handleReset = () => {
    setRunning(false)
    setRemaining(secondsForPreset(presetRef.current, workS, shortS, longS))
  }

  const openSettings = () => {
    if (running) return
    setDraftWork(String(sessionWorkMin))
    setDraftShort(String(sessionShortMin))
    setDraftLong(String(sessionLongMin))
    setSettingsOpen(true)
  }

  const closeSettings = () => setSettingsOpen(false)

  const saveSettings = async () => {
    const w = clampMin(Number(draftWork))
    const s = clampMin(Number(draftShort))
    const l = clampMin(Number(draftLong))
    if (w == null || s == null || l == null) {
      toastError(`Use ${MIN_MIN}–${MAX_MIN} minutes for each value.`)
      return
    }
    setSavingSettings(true)
    try {
      await api.put('/users/profile', {
        pomodoroSettings: { workMinutes: w, breakMinutes: s, longBreakMinutes: l },
      })
      await refreshUser()
      lastSettingsKey.current = `${w}-${s}-${l}`
      setSessionWorkMin(w)
      setSessionShortMin(s)
      setSessionLongMin(l)
      setRemaining(secondsForPreset(preset, w * 60, s * 60, l * 60))
      setSettingsOpen(false)
      toastSuccess('Pomodoro settings saved.')
    } catch {
      toastError('Could not save settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  const format = (secs) => {
    const clamped = Math.max(0, secs)
    const m = Math.floor(clamped / 60)
    const sec = clamped % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const displayedDots = Math.min(completed, MAX_DOTS)
  const dotsOverflow = completed - MAX_DOTS

  const accentBorder = running ? ACCENT_SOFT : 'rgba(255,255,255,0.12)'

  const modal =
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence mode="wait">
        {settingsOpen ? (
          <motion.div
            key="swm-settings"
            className="fixed inset-0 z-[100] flex items-center justify-center p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pomo-settings-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-[#171718]/72 backdrop-blur-[6px]"
              aria-label="Close settings"
              onClick={closeSettings}
            />
            <motion.div
              className="relative z-[101] w-full max-w-[400px] overflow-hidden rounded-[20px]"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#2f3136',
                boxShadow:
                  '0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="border-b px-8 py-5"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                  WorkNest timer
                </p>
                <h2 id="pomo-settings-title" className="mt-2 text-xl font-semibold text-white tracking-tight">
                  Settings
                </h2>
                <p className="mt-1 text-sm text-white/45">Lengths sync to your profile.</p>
              </div>

              <div className="space-y-4 px-8 py-6">
                {[
                  { label: 'Pomodoro', value: draftWork, set: setDraftWork },
                  { label: 'Short break', value: draftShort, set: setDraftShort },
                  { label: 'Long break', value: draftLong, set: setDraftLong },
                ].map((row) => (
                  <label key={row.label} className="block">
                    <span className="text-xs font-medium tabular-nums text-white/50">{row.label} (minutes)</span>
                    <input
                      type="number"
                      min={MIN_MIN}
                      max={MAX_MIN}
                      value={row.value}
                      onChange={(e) => row.set(e.target.value)}
                      className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-black/25 px-4 py-3.5 text-[15px] text-white outline-none transition focus:border-transparent focus:ring-2 focus:ring-[rgba(217,85,80,0.35)]"
                    />
                  </label>
                ))}
                {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                  <button
                    type="button"
                    onClick={() => Notification.requestPermission()}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-[13px] font-medium text-white/70 hover:bg-white/[0.07]"
                  >
                    Enable notifications
                  </button>
                )}
              </div>

              <div
                className="flex gap-3 border-t px-8 py-5"
                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.22)' }}
              >
                <button
                  type="button"
                  onClick={closeSettings}
                  className="flex-1 rounded-xl py-3.5 text-[15px] font-semibold text-white/75 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  disabled={savingSettings}
                  onClick={saveSettings}
                  className="flex-[1.2] rounded-xl py-3.5 text-[15px] font-bold uppercase tracking-wide text-white disabled:opacity-45"
                  style={{ background: ACCENT, boxShadow: `0 4px 20px ${ACCENT}44` }}
                  whileHover={{ scale: savingSettings ? 1 : 1.02 }}
                  whileTap={{ scale: savingSettings ? 1 : 0.98 }}
                >
                  {savingSettings ? 'Saving…' : 'Save'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>,
      document.body
    )

  return (
    <>
      <style>{`
        @keyframes swm-breathe-halo {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.02); }
        }
        .swm-card-shell {
          --swm-accent: ${ACCENT};
          position: relative;
          border-radius: 24px;
          overflow: clip;
          background: radial-gradient(120% 100% at 50% -10%, rgba(255,255,255,0.07), transparent 45%),
            linear-gradient(160deg, #3c3f47 0%, #2b2d33 42%, #1f2024 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 20px 50px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          isolation: isolate;
        }
        .swm-halo-ring {
          position: absolute;
          inset: auto;
          left: 50%;
          top: 44%;
          width: min(580px, 130%);
          aspect-ratio: 1;
          translate: -50% -50%;
          pointer-events: none;
          border-radius: 9999px;
          background: radial-gradient(circle at 50% 50%, rgba(217,85,80,0.14) 0%, transparent 62%);
          z-index: 0;
          animation: swm-breathe-halo 5.5s ease-in-out infinite;
        }
        .swm-num {
          font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.035em;
        }
      `}</style>

      <motion.article
        className={`swm-card-shell relative w-full min-h-[340px] text-white transition-shadow duration-[400ms] ${
          running ? 'pulse-glow-running ring-2 ring-[rgba(217,85,80,0.45)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.5)]' : ''
        }`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="swm-halo-ring" aria-hidden />
        <div
          className="relative z-[1] mx-auto flex w-full max-w-[720px] flex-col items-center px-8 pb-10 pt-10 sm:px-10 sm:pb-11 sm:pt-11"
        >
          {/* studywithme.io-style segmented tabs */}
          <div
            className="inline-flex w-full max-w-[620px] flex-wrap justify-center gap-0 rounded-full p-1 sm:flex-nowrap"
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            role="tablist"
            aria-label="Timer mode"
          >
            {TABS.map((t) => {
              const active = preset === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectPreset(t.id)}
                  disabled={running}
                  className={`swm-tab min-h-[42px] flex-1 whitespace-nowrap rounded-full px-3 py-2.5 text-[11px] font-bold tracking-wide transition sm:px-5 sm:text-xs ${
                    active
                      ? 'text-[#39403c]'
                      : 'text-white/[0.55] hover:text-white/85 disabled:text-white/30'
                  }`}
                  style={
                    active
                      ? {
                          background: '#fbfbfb',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                          color: '#39403c',
                        }
                      : { background: 'transparent' }
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {dashboardLayout && preset === 'pomodoro' && (
            <p className="relative z-[2] mt-6 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-white/40">
              Session {(completed % 4) + 1} of 4
            </p>
          )}

          {/* Hero time — study/minimal */}
          <div
            className={`relative z-[2] flex flex-col items-center ${dashboardLayout && preset === 'pomodoro' ? 'mt-8 sm:mt-10' : 'mt-14 sm:mt-16'}`}
          >
            <span
              className="swm-num text-[clamp(4.75rem,18vw,6.85rem)] font-bold leading-none text-white"
              style={{ textShadow: '0 2px 0 rgba(0,0,0,0.2), 0 0 40px rgba(255,255,255,0.12)' }}
            >
              {format(remaining)}
            </span>
            <p className={`mt-4 text-sm font-semibold tracking-[0.12em] ${dashboardLayout ? 'uppercase' : 'capitalize'}`} style={{ color: ACCENT }}>
              {preset === 'pomodoro' ? 'focus' : preset === 'shortBreak' ? 'breather' : 'deep rest'}
            </p>
          </div>

          {/* Controls */}
          <div className="mt-12 flex w-full max-w-md flex-row flex-wrap items-center justify-center gap-4 px-2 sm:gap-[18px]">
            <motion.button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="swm-num min-h-[56px] min-w-[168px] flex-1 rounded-2xl border text-[18px] font-bold uppercase tracking-[0.06em] sm:min-w-[200px]"
              style={{
                background: running ? 'rgba(255,255,255,0.12)' : '#fbfbfb',
                color: running ? 'rgba(255,255,255,0.9)' : '#39403c',
                borderColor: accentBorder,
                boxShadow: running ? undefined : `0 4px 22px rgba(0,0,0,0.25)`,
              }}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
            >
              {dashboardLayout ? (running ? 'PAUSE' : 'START') : running ? 'pause' : 'start'}
            </motion.button>
            <div className="flex shrink-0 items-center gap-[18px]">
              <motion.button
                type="button"
                onClick={handleReset}
                aria-label="Reset timer"
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-2xl text-white/95 backdrop-blur-sm hover:bg-white/[0.1]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </motion.button>
              <motion.button
                type="button"
                onClick={openSettings}
                disabled={running}
                aria-label="Open settings"
                title={running ? 'Pause timer to change settings' : 'Settings'}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-xl text-white/90 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-35"
                whileHover={running ? undefined : { scale: 1.05 }}
                whileTap={running ? undefined : { scale: 0.95 }}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Sessions */}
          <div className="mt-12 w-full max-w-md text-center">
            <span className="text-[13px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              Sessions
            </span>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 px-4">
              {completed === 0 && (
                <span className="text-sm leading-relaxed text-white/35">Finish a pomodoro to stack dots.</span>
              )}
              {displayedDots > 0 &&
                Array.from({ length: displayedDots }).map((_, i) => (
                  <span
                    key={i}
                    className="h-[10px] w-[10px] shrink-0 rounded-full"
                    style={{
                      background: ACCENT,
                      boxShadow: `0 0 10px ${ACCENT}99`,
                      opacity: 0.92,
                    }}
                  />
                ))}
              {dotsOverflow > 0 && (
                <span className="pl-2 text-xs font-semibold tabular-nums text-white/50">+{dotsOverflow}</span>
              )}
            </div>
          </div>
        </div>
      </motion.article>

      {modal}
    </>
  )
}
