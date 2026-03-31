import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/notes', label: 'Notes' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/goals', label: 'Goals' },
  { to: '/team', label: 'Team' },
  { to: '/chat', label: 'Chat' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.175, 0.885, 0.32, 1.275] } },
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-white/10 bg-[#13161d]/95 backdrop-blur-xl">
      <motion.div
        className="animate-logo-float p-4 font-display text-xl font-bold text-[#6c63ff]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
      >
        WorkNest
      </motion.div>
      <motion.nav
        className="flex-1 space-y-1 px-2"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {links.map(({ to, label, end }) => (
          <motion.div key={to} variants={item} className="overflow-hidden rounded-xl">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                  isActive
                    ? 'nav-active-gradient text-[#e8eaf0]'
                    : 'text-[#7a7f94] hover:translate-x-1 hover:bg-white/5 hover:text-[#e8eaf0]'
                }`
              }
              style={{ transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
            >
              {label}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>
    </aside>
  )
}
