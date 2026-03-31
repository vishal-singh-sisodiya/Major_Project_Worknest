import { Droppable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { TaskCard } from './TaskCard.jsx'

const titles = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }

const EMPTY_QUOTES = {
  todo: { emoji: '📝', quote: 'Every epic starts with one task.' },
  inprogress: { emoji: '⚡', quote: 'Drop something here — ship it.' },
  done: { emoji: '🏆', quote: 'Completed tasks = free serotonin.' },
}

export function KanbanColumn({ status, tasks }) {
  const empty = tasks.length === 0
  const meta = EMPTY_QUOTES[status]

  return (
    <div className="glass-card flex min-w-[280px] flex-1 flex-col rounded-xl p-3">
      <h3 className="mb-3 font-display text-sm font-semibold text-[#7a7f94]">
        {titles[status]} ({tasks.length})
      </h3>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[140px] flex-1 rounded-lg transition ${
              snapshot.isDraggingOver ? 'bg-[#6c63ff]/10 ring-2 ring-[#6c63ff]/30' : ''
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
                  <span className="text-4xl">{meta.emoji}</span>
                  <p className="mt-2 max-w-[200px] text-xs italic text-[#7a7f94]">{meta.quote}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {tasks.map((task, index) => (
              <TaskCard key={task._id} task={task} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
