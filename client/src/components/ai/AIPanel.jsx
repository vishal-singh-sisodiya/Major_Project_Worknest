import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import api from '../../utils/api.js'
import { toastError } from '../../utils/toast.js'

function TypingDots() {
  return (
    <div className="flex gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-2 w-2 rounded-full bg-[#6c63ff]"
        />
      ))}
    </div>
  )
}

function streamText(full, setDisplay, onDone) {
  const words = full.split(/(\s+)/)
  let i = 0
  setDisplay('')
  const id = setInterval(() => {
    if (i >= words.length) {
      clearInterval(id)
      onDone?.()
      return
    }
    setDisplay((prev) => prev + words[i])
    i++
  }, 35)
  return () => clearInterval(id)
}

export function AIPanel({ tasks = [] }) {
  const [output, setOutput] = useState('')
  const [displayOutput, setDisplayOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const cleanupRef = useRef(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  const run = async (action) => {
    if (cleanupRef.current) cleanupRef.current()
    setLoading(true)
    setOutput('')
    setDisplayOutput('')
    try {
      let text = ''
      if (action === 'summarize') {
        const { data } = await api.post('/ai/summarize', { content: 'Sample note content.' })
        text = data.summary || ''
      } else if (action === 'plan') {
        const { data } = await api.post('/ai/plan-day', {
          tasks: tasks.map((t) => ({ title: t.title, status: t.status })),
        })
        text = data.plan || ''
      } else if (action === 'suggest') {
        const { data } = await api.post('/ai/suggest-tasks', {
          projectName: 'WorkNest',
          description: 'Team tasks',
        })
        text = JSON.stringify(data.tasks, null, 2)
      } else if (action === 'prioritize') {
        const { data } = await api.post('/ai/prioritize', {
          tasks: tasks.map((t) => t.title),
        })
        text = JSON.stringify(data.ranked, null, 2)
      } else if (action === 'chat') {
        const { data } = await api.post('/ai/chat', {
          message: 'One productivity tip.',
          context: '',
        })
        text = data.reply || ''
      }
      setOutput(text)
      cleanupRef.current = streamText(text, setDisplayOutput, () => {
        cleanupRef.current = null
      })
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Request failed'
      setOutput(msg)
      setDisplayOutput(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gradient-border-wrap">
      <div className="gradient-border-inner flex min-h-[280px] flex-col rounded-[15px] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-[#6c63ff]">AI Panel</h3>
          <span className="rounded-full border border-[#6c63ff]/30 bg-[#6c63ff]/10 px-2 py-0.5 text-[10px] text-[#a78bfa]">
            Powered by Claude ✨
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['summarize', 'Summarize'],
            ['plan', 'Plan day'],
            ['suggest', 'Suggest tasks'],
            ['prioritize', 'Prioritize'],
            ['chat', 'Chat'],
          ].map(([key, label]) => (
            <motion.button
              key={key}
              type="button"
              disabled={loading}
              onClick={() => run(key)}
              className="btn-interactive rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#e8eaf0] disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {label}
            </motion.button>
          ))}
        </div>
        <div className="mt-4 flex-1 overflow-auto rounded-lg border border-white/10 bg-[#0d0f14]/80 p-3">
          {loading && !displayOutput ? (
            <TypingDots />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-[#e8eaf0]">
              {displayOutput || output || 'Select an action.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
