import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { toastSuccess, toastError } from '../utils/toast.js'
import Tilt from 'react-parallax-tilt'

function PurpleOrbs() {
  return (
    <div className="wn-orbs">
      <div
        className="wn-orb h-72 w-72 bg-[#6c63ff]"
        style={{ top: '-8%', left: '-6%', animationDelay: '0s' }}
      />
      <div
        className="wn-orb h-96 w-96 bg-[#8b5cf6]"
        style={{ bottom: '-12%', right: '-8%', animationDelay: '-4s' }}
      />
      <div
        className="wn-orb h-48 w-48 bg-[#4c1d95]"
        style={{ top: '40%', right: '22%', animationDelay: '-7s', opacity: 0.35 }}
      />
    </div>
  )
}

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.07, duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] },
  }),
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Email and password required')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      toastSuccess("You're in!")
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--wn-bg)] p-4">
      <PurpleOrbs />
      <ParticlesLite />
      <Tilt tiltMaxAngle={8} glareEnable glareMaxOpacity={0.12} glareColor="#6c63ff" className="relative z-10 w-full max-w-md">
        <motion.div
          className="wn-card rounded-2xl border border-[color:var(--wn-border-strong)] bg-[var(--wn-auth-panel)] p-9 shadow-[0_32px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <motion.div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#8b5cf6] font-display text-2xl font-extrabold text-white shadow-[0_0_32px_rgba(108,99,255,0.65)]"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              W
            </motion.div>
            <div>
              <motion.h1
                className="font-display text-3xl font-extrabold text-[var(--wn-fg)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Welcome Back
              </motion.h1>
              <p className="mt-2 text-sm text-[var(--wn-muted)]">Login to continue to your workspace</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <motion.label custom={0} variants={fieldVariants} initial="hidden" animate="show" className="block overflow-hidden">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--wn-muted)]">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-placeholder)] focus:border-[#6c63ff]/55 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/22"
                placeholder="you@team.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </motion.label>

            <motion.label custom={1} variants={fieldVariants} initial="hidden" animate="show" className="block overflow-hidden">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--wn-muted)]">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 pr-28 text-[var(--wn-fg)] placeholder-[var(--wn-placeholder)] focus:border-[#6c63ff]/55 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/22"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <motion.button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6c63ff]"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? 'Hide' : 'Show'}
                </motion.button>
              </div>
            </motion.label>

            <div className="flex justify-end">
              <motion.button type="button" whileHover={{ x: -2 }} className="text-xs font-semibold text-[#8b5cf6] hover:underline">
                Forgot password?
              </motion.button>
            </div>

            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: error ? 1 : 0, height: error ? 'auto' : 0 }}
              className="overflow-hidden"
            >
              {error && <p className="text-sm text-rose-400">{error}</p>}
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              custom={2}
              variants={fieldVariants}
              initial="hidden"
              animate="show"
              whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(108,99,255,0.55)' }}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] py-3.5 font-display text-base font-bold text-white shadow-xl disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Login'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--wn-muted)]">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-[#6c63ff] transition hover:text-[#8b5cf6] hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </Tilt>
    </div>
  )
}

function ParticlesLite() {
  return (
    <div className="particles">
      {[...Array(14)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${4 + i * 6}%`,
            animationDelay: `${i * 0.45}s`,
            background: i % 2 === 0 ? 'rgba(108,99,255,0.45)' : 'rgba(139,92,246,0.3)',
          }}
        />
      ))}
    </div>
  )
}
