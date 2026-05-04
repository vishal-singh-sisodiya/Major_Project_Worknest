const Message = require('../models/Message');
const { getUserWorkspaceRole } = require('../utils/workspaceAccess');
const { parseRoom, assertChannelAllowed, assertDmAllowed } = require('../utils/chatRoom');
const { persistRoomMessage } = require('../utils/roomMessagePersist');

async function listByRoom(req, res) {
  try {
    const roomId = decodeURIComponent(req.params.roomId || '');
    const parsed = parseRoom(roomId);
    if (!parsed) return res.status(400).json({ message: 'Invalid room id' });

    const workspaceId = parsed.workspaceId;
    const role = await getUserWorkspaceRole(req.userId, workspaceId);
    if (!role) return res.status(403).json({ message: 'Not a member' });

    if (parsed.type === 'channel') {
      const ch = await assertChannelAllowed(workspaceId, parsed.slug);
      if (!ch.ok) return res.status(400).json({ message: ch.reason });
    } else {
      const dm = await assertDmAllowed(
        workspaceId,
        req.userId,
        parsed.peerA,
        parsed.peerB
      );
      if (!dm.ok) return res.status(403).json({ message: dm.reason });
    }

    const rows = await Message.find({ workspaceId, roomId })
      .populate('sender', 'name avatar email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(rows.reverse());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function postToRoom(req, res) {
  try {
    const roomId = decodeURIComponent(req.params.roomId || '');
    const { text, attachment } = req.body || {};
    const populated = await persistRoomMessage(roomId, req.userId, text, attachment);
    const io = req.app.get('io');
    if (io) io.to(roomId).emit('new-message', { message: populated });
    res.status(201).json(populated);
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ message: e.message || 'Error' });
  }
}

module.exports = { listByRoom, postToRoom };
