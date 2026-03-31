import { ChatBox } from '../components/chat/ChatBox.jsx'

function wid() {
  return localStorage.getItem('workspaceId')
}

export default function Chat() {
  const workspace = wid()
  if (!workspace) {
    return <p className="text-[#7a7f94]">Select a workspace from Team.</p>
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-[#e8eaf0]">Chat</h1>
      <ChatBox workspaceId={workspace} />
    </div>
  )
}
