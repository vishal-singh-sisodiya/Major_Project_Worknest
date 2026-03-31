import { useCallback, useMemo } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { KanbanColumn } from './KanbanColumn.jsx'
import api from '../../utils/api.js'
import { useSocket } from '../../context/SocketContext.jsx'
import { toastSuccess } from '../../utils/toast.js'

const STATUSES = ['todo', 'inprogress', 'done']

function addXP(amount) {
  const k = 'worknest_xp'
  const n = Number(localStorage.getItem(k) || 0) + amount
  localStorage.setItem(k, String(n))
  window.dispatchEvent(new Event('storage'))
}

export function KanbanBoard({ workspaceId, tasks, setTasks }) {
  const { socket } = useSocket()

  const byStatus = useMemo(() => {
    const map = { todo: [], inprogress: [], done: [] }
    for (const t of tasks || []) {
      if (map[t.status]) map[t.status].push(t)
      else map.todo.push(t)
    }
    for (const s of STATUSES) {
      map[s].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }
    return map
  }, [tasks])

  const onDragEnd = useCallback(
    async (result) => {
      const { destination, source, draggableId } = result
      if (!destination || !workspaceId) return
      if (destination.droppableId === source.droppableId && destination.index === source.index)
        return

      const newStatus = destination.droppableId
      const moved = tasks.find((t) => t._id === draggableId)
      if (!moved) return

      const wasDone = source.droppableId === 'done'
      const nowDone = newStatus === 'done'
      if (!wasDone && nowDone) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6c63ff', '#a78bfa', '#34d399', '#fbbf24'],
        })
        addXP(10)
        toastSuccess('Task crushed — +10 XP 🎉')
      }

      const otherTasks = tasks.filter((t) => t._id !== draggableId)
      const insertList = [...byStatus[newStatus]].filter((t) => t._id !== draggableId)
      insertList.splice(destination.index, 0, {
        ...moved,
        status: newStatus,
        order: destination.index,
      })
      const reordered = insertList.map((t, i) => ({ ...t, order: i }))
      const nextTasks = [
        ...otherTasks.filter((t) => t.status !== newStatus),
        ...reordered,
      ]
      setTasks(nextTasks)

      try {
        await api.put(`/tasks/${draggableId}/move`, {
          status: newStatus,
          order: destination.index,
        })
        socket?.emit('task-move', {
          workspaceId,
          taskId: draggableId,
          status: newStatus,
          order: destination.index,
        })
      } catch {
        setTasks(tasks)
      }
    },
    [workspaceId, tasks, byStatus, setTasks, socket]
  )

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <motion.div
        className="flex gap-4 overflow-x-auto pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} tasks={byStatus[status] || []} />
        ))}
      </motion.div>
    </DragDropContext>
  )
}
