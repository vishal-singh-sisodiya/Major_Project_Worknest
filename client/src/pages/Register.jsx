import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { toastSuccess, toastError } from '../utils/toast.js'
import Tilt from 'react-parallax-tilt'

function PurpleOrbs() {
  return (
    <div className="wn-orbs">
      <div className="wn-orb h-80 w-80 bg-emerald-600/70" style={{ top: '-10%', left: '-4%', animationDelay: '-2s' }} />
      <div className="wn-orb h-[28rem] w-[28rem] bg-[#6c63ff]" style={{ bottom: '-18%', right: '-14%', animationDelay: '-6s' }} />
    </div>
  )
}

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.06, duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] },
  }),
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email || password.length < 6) {
      setError('Name, email required; password min 6 characters')
      return
    }
    setLoading(true)
    try {
      await register(name.trim(), email, password)
      toastSuccess('Account ready — welcome!')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--wn-bg)] p-4">
      <PurpleOrbs />
      <div className="particles">
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${3 + i * 7}%`,
              animationDelay: `${i * 0.4}s`,
              background: i % 3 === 0 ? 'rgba(52,211,153,0.25)' : 'rgba(108,99,255,0.38)',
            }}
          />
        ))}
      </div>
      <Tilt tiltMaxAngle={6} glareEnable glareMaxOpacity={0.1} glareColor="#6c63ff" className="relative z-10 w-full max-w-md">
        <motion.div
          className="wn-card rounded-2xl border border-[color:var(--wn-border-strong)] bg-[var(--wn-auth-panel)] p-9 shadow-[0_32px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 28, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c63ff] to-[#8b5cf6] font-display text-2xl font-extrabold text-white shadow-[0_0_28px_rgba(108,99,255,0.55)]">
              W
            </div>
            <h1 className="font-display text-3xl font-extrabold text-[var(--wn-fg)]">Create account</h1>
            <p className="mt-2 text-sm text-[var(--wn-muted)]">Your workspace awaits</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <motion.label custom={0} variants={fieldVariants} initial="hidden" animate="show" className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--wn-muted)]">Name</span>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-placeholder)] focus:border-[#6c63ff]/55 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/22"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </motion.label>
            <motion.label custom={1} variants={fieldVariants} initial="hidden" animate="show" className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--wn-muted)]">Email</span>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 text-[var(--wn-fg)] placeholder-[var(--wn-placeholder)] focus:border-[#6c63ff]/55 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/22"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </motion.label>
            <motion.label custom={2} variants={fieldVariants} initial="hidden" animate="show" className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--wn-muted)]">Password (min 6)</span>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[color:var(--wn-border)] bg-[var(--wn-deep)] px-4 py-3 pr-24 text-[var(--wn-fg)] placeholder-[var(--wn-placeholder)] focus:border-[#6c63ff]/55 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/22"
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
              custom={3}
              variants={fieldVariants}
              initial="hidden"
              animate="show"
              whileHover={{ scale: 1.02, boxShadow: '0 0 28px rgba(108,99,255,0.5)' }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] py-3.5 font-display font-bold text-white disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Register'}
            </motion.button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--wn-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#6c63ff] hover:underline">
              Login
            </Link>
          </p>
        </motion.div>
      </Tilt>
    </div>
  )
}
