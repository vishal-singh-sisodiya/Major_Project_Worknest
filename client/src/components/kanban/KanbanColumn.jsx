import { Droppable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { TaskCard } from './TaskCard.jsx'

const titles = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }

const EMPTY_QUOTES = {
  todo: { quote: 'Every epic starts with one task.' },
  inprogress: { quote: 'Drop something here — ship it.' },
  done: { quote: 'Completed tasks stack up here.' },
}

export function KanbanColumn({ status, tasks, headerAccentClass, onAddTask, readOnly = false }) {
  const empty = tasks.length === 0
  const meta = EMPTY_QUOTES[status]

  return (
    <div className="wn-card wn-card-hover flex min-w-[280px] flex-1 flex-col rounded-xl p-3 shadow-lg">
      <div
        className={`mb-3 rounded-xl border bg-gradient-to-r px-3 py-2 ${headerAccentClass || 'border-[color:var(--wn-border)] from-[#6c63ff]/20'}`}
      >
        <h3 className="font-display text-sm font-bold text-[var(--wn-fg)]">
          {titles[status]} <span className="text-[var(--wn-muted)] font-medium">({tasks.length})</span>
        </h3>
      </div>
      <Droppable droppableId={status} isDropDisabled={readOnly}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`mb-3 min-h-[140px] flex-1 rounded-xl transition ${
              snapshot.isDraggingOver
                ? 'bg-[#6c63ff]/10 ring-2 ring-[#6c63ff]/35'
                : 'bg-black/15'
            }`}
          >
            <AnimatePresence>
              {empty && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <p className="max-w-[200px] text-xs italic text-[var(--wn-muted)]">{meta.quote}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {tasks.map((task, index) => (
              <TaskCard key={task._id} task={task} index={index} readOnly={readOnly} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {onAddTask && (
        <motion.button
          type="button"
          className="wn-btn w-full rounded-xl border border-dashed border-[color:var(--wn-border-strong)] bg-[var(--wn-hover)] py-2.5 text-xs font-semibold text-[var(--wn-muted)] hover:border-[#6c63ff]/40 hover:text-[#6c63ff]"
          onClick={onAddTask}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          + Add Task
        </motion.button>
      )}
    </div>
  )
}
