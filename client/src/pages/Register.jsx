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
            left: `${5 + i * 7}%`,
            animationDelay: `${i * 0.5}s`,
            background: i % 3 === 0 ? 'rgba(52,211,153,0.25)' : 'rgba(108,99,255,0.3)',
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
    transition: { delay: 0.12 + i * 0.07, duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] },
  }),
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      toastSuccess('Account ready — welcome! ✨')
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
    <div className="mesh-bg flex min-h-screen items-center justify-center p-4">
      <Particles />
      <Tilt tiltMaxAngle={5} glareEnable glareMaxOpacity={0.12} className="relative z-10 w-full max-w-md">
      <motion.div
        className="glass-card rounded-2xl p-8"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
      >
        <motion.h1
          className="animate-logo-float font-display mb-2 text-2xl font-bold text-[#6c63ff]"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          Create account
        </motion.h1>
        <p className="mb-6 text-sm text-[#7a7f94]">Your workspace awaits</p>
        <form onSubmit={submit} className="space-y-4">
          {[
            ['Name', 'text', name, setName, false],
            ['Email', 'email', email, setEmail, false],
            ['Password (min 6)', 'password', password, setPassword, true],
          ].map(([label, type, val, setVal, isPass], i) => (
            <motion.label key={label} className="block overflow-hidden" custom={i} variants={fieldVariants} initial="hidden" animate="show">
              <span className="mb-1 block text-sm text-[#7a7f94]">{label}</span>
              <input
                type={type}
                required
                minLength={isPass ? 6 : undefined}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[#e8eaf0] focus:border-[#6c63ff]/50 focus:outline-none focus:ring-2 focus:ring-[#6c63ff]/20"
                value={val}
                onChange={(e) => setVal(e.target.value)}
              />
            </motion.label>
          ))}
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
            custom={3}
            variants={fieldVariants}
            initial="hidden"
            animate="show"
          >
            {loading ? 'Creating…' : 'Register'}
          </motion.button>
        </form>
        <p className="mt-4 text-center text-sm text-[#7a7f94]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#6c63ff] hover:underline">
            Login
          </Link>
        </p>
      </motion.div>
      </Tilt>
    </div>
  )
}
