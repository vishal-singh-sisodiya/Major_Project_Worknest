import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'

const XP_PER_LEVEL = 100

function getXP() {
  return Number(localStorage.getItem('worknest_xp') || 0)
}

export function Topbar({ workspaceName, onMenuClick }) {
  const { user, logout } = useAuth()
  const [xp, setXp] = useState(getXP)
  const [searchFocused, setSearchFocused] = useState(false)
  const [bellShake, setBellShake] = useState(false)

  useEffect(() => {
    const onStorage = () => setXp(getXP())
    window.addEventListener('storage', onStorage)
    const id = setInterval(() => setXp(getXP()), 2000)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(id)
    }
  }, [])

  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL

  return (
    <header
      className="sticky top-0 z-30 border-b border-[color:var(--wn-border)] px-4 py-3 backdrop-blur-xl sm:px-6"
      style={{ background: 'var(--wn-topbar)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <motion.button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] text-[var(--wn-fg)] lg:hidden"
            onClick={onMenuClick}
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(108,99,255,0.25)' }}
            whileTap={{ scale: 0.96 }}
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.button>
          <div className="min-w-0 flex-1">
            {workspaceName && <span className="text-xs text-[var(--wn-muted)]">Workspace · </span>}
            <span className="font-display text-sm font-semibold text-[var(--wn-fg)] sm:text-base">
              {workspaceName || 'WorkNest'}
            </span>
          </div>
        </div>

        <motion.div
          className="hidden max-w-md flex-1 md:block"
          animate={{ scale: searchFocused ? 1.01 : 1 }}
          transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          <input
            type="search"
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] px-4 py-2.5 text-sm text-[var(--wn-fg)] placeholder-[var(--wn-muted)] shadow-inner transition-all focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/25"
          />
        </motion.div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <motion.button
            type="button"
            className={`rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] p-2 text-[var(--wn-muted)] ${bellShake ? 'bell-shake' : ''}`}
            whileHover={{ scale: 1.02, boxShadow: '0 0 18px rgba(108,99,255,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setBellShake(true)}
            onAnimationEnd={() => setBellShake(false)}
            title="Notifications"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </motion.button>
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-sm font-medium text-[var(--wn-fg)]">{user?.name}</span>
            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6]"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
              />
            </div>
            <span className="text-[10px] text-[var(--wn-muted)]">
              Lvl {level} · {xp} XP
            </span>
          </div>
          <motion.button
            type="button"
            onClick={logout}
            className="rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-panel)] px-3 py-2 text-xs font-medium text-[var(--wn-muted)] sm:text-sm"
            whileHover={{ scale: 1.02, color: 'var(--wn-fg)', boxShadow: '0 0 16px rgba(108,99,255,0.2)' }}
            whileTap={{ scale: 0.97 }}
          >
            Log out
          </motion.button>
        </div>
      </div>
    </header>
  )
}
