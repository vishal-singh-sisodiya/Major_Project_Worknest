import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar.jsx'
import { Topbar } from './Topbar.jsx'

const pageTransition = {
  initial: { opacity: 0, x: 24, filter: 'blur(4px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, x: -24, filter: 'blur(4px)' },
  transition: { duration: 0.25, ease: [0.175, 0.885, 0.32, 1.275] },
}

export function Layout({ workspaceName }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#0d0f14]">
      <Sidebar />
      <div className="pl-[220px]">
        <Topbar workspaceName={workspaceName} />
        <main className="p-6">
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
