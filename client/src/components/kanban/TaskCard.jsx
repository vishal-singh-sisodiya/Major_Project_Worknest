import { useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../utils/api.js'
import { toastSuccess, toastError } from '../../utils/toast.js'

function priorityBar(priority) {
  if (priority === 'high') return 'bg-rose-500'
  if (priority === 'low') return 'bg-emerald-500'
  return 'bg-amber-500'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TaskCard({ task, index }) {
  const [done, setDone] = useState(task.status === 'done')
  const [popping, setPopping] = useState(false)

  const toggleDone = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    const next = !done
    setDone(next)
    setPopping(true)
    try {
      await api.put(`/tasks/${task._id}`, { status: next ? 'done' : 'todo' })
      if (next) toastSuccess('Done ✅')
    } catch {
      setDone(!next)
      toastError('Could not update')
    }
    setTimeout(() => setPopping(false), 400)
  }

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`glass-card mb-2 rounded-xl p-3 ${
            snapshot.isDragging ? 'scale-105 shadow-2xl shadow-[#6c63ff]/20' : ''
          }`}
          style={{
            ...provided.draggableProps.style,
            transition: snapshot.isDragging
              ? provided.draggableProps.style?.transition
              : 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <div className="flex items-start gap-2">
            <motion.button
              type="button"
              onClick={toggleDone}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                done
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                  : 'border-white/20 hover:border-[#6c63ff]/50'
              }`}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence>
                {done && (
                  <motion.span
                    key="check"
                    className="check-pop text-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <div className="min-w-0 flex-1">
              <div className={`mb-2 h-1 w-full rounded ${priorityBar(task.priority)}`} />
              <div className={`font-medium text-[#e8eaf0] ${done ? 'line-through opacity-60' : ''}`}>
                {task.title}
              </div>
              {task.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {task.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg bg-white/5 px-2 py-0.5 text-xs text-[#7a7f94]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 text-xs text-[#7a7f94]">{formatDate(task.dueDate)}</div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
