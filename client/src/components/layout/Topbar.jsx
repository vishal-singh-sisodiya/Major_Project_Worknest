import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

const XP_PER_LEVEL = 100

function getXP() {
  return Number(localStorage.getItem('worknest_xp') || 0)
}

export function Topbar({ workspaceName }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
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
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#13161d]/80 px-6 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          {workspaceName && (
            <span className="text-sm text-[#7a7f94]">Workspace · </span>
          )}
          <span className="font-display font-semibold text-[#e8eaf0]">
            {workspaceName || 'WorkNest'}
          </span>
        </div>
        <motion.div
          className="hidden max-w-xs flex-1 sm:block"
          animate={{ scale: searchFocused ? 1.02 : 1 }}
          transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          <input
            type="search"
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#e8eaf0] placeholder-[#7a7f94] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
          />
        </motion.div>
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            className={`rounded-lg p-2 text-[#7a7f94] hover:bg-white/5 ${bellShake ? 'bell-shake' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setBellShake(true)}
            onAnimationEnd={() => setBellShake(false)}
            title="Notifications"
          >
            🔔
          </motion.button>
          <motion.button
            type="button"
            onClick={toggleTheme}
            className="btn-interactive rounded-lg px-2 py-1 text-sm text-[#7a7f94]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </motion.button>
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-sm text-[#e8eaf0]">{user?.name}</span>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa]"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
              />
            </div>
            <span className="text-[10px] text-[#7a7f94]">
              Lvl {level} · {xp} XP
            </span>
          </div>
          <motion.button
            type="button"
            onClick={logout}
            className="btn-interactive rounded-xl border border-white/10 px-3 py-1.5 text-sm text-[#7a7f94]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Log out
          </motion.button>
        </div>
      </div>
    </header>
  )
}
