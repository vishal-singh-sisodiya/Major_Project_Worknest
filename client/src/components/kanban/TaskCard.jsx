import { useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../utils/api.js'
import { toastSuccess, toastError } from '../../utils/toast.js'

function priorityDot(priority) {
  if (priority === 'high') return 'bg-rose-500'
  if (priority === 'low') return 'bg-emerald-500'
  return 'bg-amber-500'
}

function priorityLabel(priority) {
  if (priority === 'high') return 'High'
  if (priority === 'low') return 'Low'
  return 'Medium'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function snippet(desc) {
  if (!desc) return ''
  const plain = desc.replace(/<[^>]+>/g, '').trim()
  return plain.length > 72 ? `${plain.slice(0, 72)}…` : plain
}

export function TaskCard({ task, index, readOnly = false }) {
  const [done, setDone] = useState(task.status === 'done')
  const firstAssignee = task.assignedTo?.[0] || task.assignees?.[0]

  const toggleDone = async (e) => {
    if (readOnly) return
    e.stopPropagation()
    e.preventDefault()
    const next = !done
    setDone(next)
    try {
      await api.put(`/tasks/${task._id}`, { status: next ? 'done' : 'todo' })
      if (next) toastSuccess('Done')
    } catch {
      setDone(!next)
      toastError('Could not update')
    }
  }

  return (
    <Draggable draggableId={task._id} index={index} isDragDisabled={readOnly}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`wn-card mb-2 rounded-xl p-3 ${
            snapshot.isDragging
              ? 'scale-[1.02] shadow-2xl shadow-[#6c63ff]/25 ring-2 ring-[#6c63ff]/30'
              : ''
          }`}
          style={{
            ...provided.draggableProps.style,
            transition: snapshot.isDragging
              ? provided.draggableProps.style?.transition
              : 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <div className="flex items-start gap-3">
            <motion.button
              type="button"
              disabled={readOnly}
              onClick={toggleDone}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                done
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                  : 'border-[color:var(--wn-border-strong)] hover:border-[#6c63ff]/50'
              } ${readOnly ? 'cursor-default opacity-80' : ''}`}
              whileTap={readOnly ? undefined : { scale: 0.9 }}
            >
              <AnimatePresence>
                {done && (
                  <motion.span
                    key="check"
                    className="check-pop flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    aria-hidden
                  >
                    <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot(task.priority)}`} />
                <span className="rounded-md bg-[var(--wn-hover-strong)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--wn-muted)]">
                  {priorityLabel(task.priority)}
                </span>
              </div>
              <div className={`mt-2 font-semibold text-[var(--wn-fg)] ${done ? 'line-through opacity-55' : ''}`}>
                {task.title}
              </div>
              {snippet(task.description) && (
                <div className="mt-1 line-clamp-2 text-xs text-[var(--wn-muted)]">{snippet(task.description)}</div>
              )}
              {task.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {task.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-lg bg-[var(--wn-deep)] px-2 py-0.5 text-[10px] text-[var(--wn-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--wn-muted)]">{formatDate(task.dueDate)}</span>
                {firstAssignee && (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6c63ff] to-[#4338ca] text-[10px] font-bold text-white ring-2 ring-[var(--wn-panel)]"
                    title={firstAssignee.name}
                  >
                    {(firstAssignee.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
