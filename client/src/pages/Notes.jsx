import { useState, useEffect } from 'react'
import api from '../utils/api.js'

function wid() {
  return localStorage.getItem('workspaceId')
}

export default function Notes() {
  const workspace = wid()
  const [notes, setNotes] = useState([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const load = async () => {
    if (!workspace) return
    const { data } = await api.get(`/notes/${workspace}`)
    setNotes(data)
  }

  useEffect(() => {
    load()
  }, [workspace])

  const openNew = () => {
    setSelected(null)
    setTitle('')
    setContent('')
    setEditorOpen(true)
  }

  const openEdit = (n) => {
    setSelected(n)
    setTitle(n.title || '')
    setContent(n.content || '')
    setEditorOpen(true)
  }

  const save = async () => {
    if (!workspace) return
    if (selected) {
      await api.put(`/notes/${selected._id}`, {
        workspaceId: workspace,
        title,
        content,
      })
    } else {
      await api.post('/notes', { workspaceId: workspace, title, content })
    }
    setEditorOpen(false)
    load()
  }

  if (!workspace) {
    return <p className="text-[#7a7f94]">Select a workspace from Team.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[#e8eaf0]">Notes</h1>
        <button
          type="button"
          onClick={openNew}
          className="rounded-xl bg-[#6c63ff] px-4 py-2 text-sm text-white"
        >
          New note
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((n) => (
          <button
            key={n._id}
            type="button"
            onClick={() => openEdit(n)}
            className="rounded-xl border border-white/10 bg-[#1a1e28] p-4 text-left transition hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="text-lg">{n.emoji || '📝'}</div>
            <div className="mt-2 font-display font-semibold text-[#e8eaf0]">
              {n.title || 'Untitled'}
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-[#7a7f94]">
              {(n.content || '').replace(/<[^>]+>/g, '')}
            </div>
          </button>
        ))}
      </div>
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#13161d] p-6">
            <h2 className="font-display mb-4 text-lg text-[#e8eaf0]">
              {selected ? 'Edit note' : 'New note'}
            </h2>
            <input
              className="mb-3 w-full rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="mb-4 min-h-[160px] w-full rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
              placeholder="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-[#e8eaf0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-xl bg-[#6c63ff] px-4 py-2 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
