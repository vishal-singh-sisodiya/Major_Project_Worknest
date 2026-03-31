import { useState, useEffect } from 'react'
import api from '../utils/api.js'

export default function Team() {
  const [workspaces, setWorkspaces] = useState([])
  const [current, setCurrent] = useState(null)
  const [joinCode, setJoinCode] = useState('')

  const load = async () => {
    const { data } = await api.get('/workspaces/my')
    setWorkspaces(data)
    let wid = localStorage.getItem('workspaceId')
    if (wid && data.some((w) => w._id === wid)) {
      const { data: detail } = await api.get(`/workspaces/${wid}`)
      setCurrent(detail)
    } else if (data[0]) {
      wid = data[0]._id
      localStorage.setItem('workspaceId', wid)
      const { data: detail } = await api.get(`/workspaces/${wid}`)
      setCurrent(detail)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selectWs = async (id) => {
    localStorage.setItem('workspaceId', id)
    const { data } = await api.get(`/workspaces/${id}`)
    setCurrent(data)
  }

  const copyInvite = () => {
    if (current?.inviteCode) navigator.clipboard.writeText(current.inviteCode)
  }

  const join = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    await api.post('/workspaces/join', { inviteCode: joinCode.trim() })
    setJoinCode('')
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[#e8eaf0]">Team</h1>
      <div className="flex flex-wrap gap-2">
        {workspaces.map((w) => (
          <button
            key={w._id}
            type="button"
            onClick={() => selectWs(w._id)}
            className={`rounded-xl px-4 py-2 text-sm ${
              current?._id === w._id
                ? 'bg-[#6c63ff] text-white'
                : 'border border-white/10 bg-[#1a1e28] text-[#e8eaf0]'
            }`}
          >
            {w.name}
          </button>
        ))}
      </div>
      {current && (
        <>
          <div className="rounded-xl border border-white/10 bg-[#1a1e28] p-4">
            <div className="mb-2 text-sm text-[#7a7f94]">Invite code</div>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-[#0d0f14] px-3 py-2 font-mono text-[#6c63ff]">
                {current.inviteCode}
              </code>
              <button
                type="button"
                onClick={copyInvite}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-[#e8eaf0]"
              >
                Copy
              </button>
            </div>
          </div>
          <form onSubmit={join} className="flex gap-2">
            <input
              placeholder="Join with invite code"
              className="flex-1 rounded-xl border border-white/10 bg-[#1a1e28] px-4 py-2 text-[#e8eaf0]"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-[#6c63ff] px-4 py-2 text-white"
            >
              Join
            </button>
          </form>
          <ul className="space-y-2">
            {current.members?.map((m) => (
              <li
                key={m.user?._id || m.user}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1a1e28] p-3"
              >
                <span className="text-[#e8eaf0]">{m.user?.name}</span>
                <span className="rounded-lg bg-[#13161d] px-2 py-0.5 text-xs text-[#7a7f94]">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
