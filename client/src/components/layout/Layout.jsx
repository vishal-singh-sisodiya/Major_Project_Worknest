import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar.jsx'
import { Topbar } from './Topbar.jsx'

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.28, ease: [0.175, 0.885, 0.32, 1.275] },
}

export function Layout({ workspaceName, activeWorkspaceId, onWorkspaceActivate }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--wn-bg)] text-[var(--wn-fg)] transition-colors">
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceActivate={onWorkspaceActivate}
      />

      <div className="lg:pl-[220px]">
        <Topbar workspaceName={workspaceName} onMenuClick={() => setSidebarOpen((o) => !o)} />
        <main className="min-h-[calc(100vh-56px)] p-4 pb-28 sm:p-6 sm:pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              transition={pageTransition.transition}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
