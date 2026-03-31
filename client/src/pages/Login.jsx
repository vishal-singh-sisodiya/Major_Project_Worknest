import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { toastSuccess, toastError } from '../utils/toast.js'
import Tilt from 'react-parallax-tilt'

function Particles() {
  return (
    <div className="particles">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${8 + i * 8}%`,
            animationDelay: `${i * 0.6}s`,
            background: i % 2 ? 'rgba(108,99,255,0.35)' : 'rgba(244,63,94,0.2)',
          }}
        />
      ))}
    </div>
  )
}

const fieldVariants = {
  hidden: { opacity: 0, x: -20 },
  show: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + i * 0.08, duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] },
  }),
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      toastSuccess("You're in! 🔥")
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
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4">
      <Particles />
      <Tilt tiltMaxAngle={6} glareEnable glareMaxOpacity={0.15} className="relative z-10 w-full max-w-md">
      <motion.div
        className="glass-card rounded-2xl p-8"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
      >
        <motion.h1
          className="animate-logo-float font-display mb-2 text-2xl font-bold text-[#6c63ff]"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          WorkNest
        </motion.h1>
        <p className="mb-6 text-sm text-[#7a7f94]">Sign in — let&apos;s get it</p>
        <form onSubmit={submit} className="space-y-4">
          <motion.label className="block overflow-hidden" custom={0} variants={fieldVariants} initial="hidden" animate="show">
            <span className="mb-1 block text-sm text-[#7a7f94]">Email</span>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[#e8eaf0] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </motion.label>
          <motion.label className="block overflow-hidden" custom={1} variants={fieldVariants} initial="hidden" animate="show">
            <span className="mb-1 block text-sm text-[#7a7f94]">Password</span>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[#e8eaf0] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </motion.label>
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
            className="shimmer-btn btn-interactive w-full rounded-xl bg-[#6c63ff] py-2.5 font-medium text-white disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            custom={2}
            variants={fieldVariants}
            initial="hidden"
            animate="show"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </motion.button>
        </form>
        <p className="mt-4 text-center text-sm text-[#7a7f94]">
          No account?{' '}
          <Link to="/register" className="text-[#6c63ff] transition hover:underline">
            Register
          </Link>
        </p>
      </motion.div>
      </Tilt>
    </div>
  )
}
