const Message = require('../models/Message');
const { getUserWorkspaceRole } = require('./workspaceAccess');
const { parseRoom, assertChannelAllowed, assertDmAllowed } = require('./chatRoom');

const MAX_ATTACHMENT_B64 = 14 * 1024 * 1024; // ~10.5 MiB file as base64

function normalizeAttachment(raw) {
  if (!raw || typeof raw !== 'object' || !raw.data) return null;
  return {
    name: String(raw.name || 'file').trim().slice(0, 256),
    type: String(raw.type || 'application/octet-stream').trim().slice(0, 200),
    data: String(raw.data).slice(0, MAX_ATTACHMENT_B64),
  };
}

async function persistRoomMessage(roomId, senderId, rawText, attachmentRaw) {
  const text = String(rawText || '').trim().slice(0, 8000);
  const attachment = normalizeAttachment(attachmentRaw);
  const displayText =
    text || (attachment ? `Attachment: ${attachment.name}` : '');
  if (!displayText && !attachment) {
    const err = new Error('text or attachment required');
    err.status = 400;
    throw err;
  }

  const parsed = parseRoom(roomId);
  if (!parsed) {
    const err = new Error('Invalid room id');
    err.status = 400;
    throw err;
  }

  const workspaceId = parsed.workspaceId;
  const role = await getUserWorkspaceRole(senderId, workspaceId);
  if (!role) {
    const err = new Error('Not a member');
    err.status = 403;
    throw err;
  }

  if (parsed.type === 'channel') {
    const ch = await assertChannelAllowed(workspaceId, parsed.slug);
    if (!ch.ok) {
      const err = new Error(ch.reason);
      err.status = 400;
      throw err;
    }
  } else {
    const dm = await assertDmAllowed(
      workspaceId,
      senderId,
      parsed.peerA,
      parsed.peerB
    );
    if (!dm.ok) {
      const err = new Error(dm.reason);
      err.status = 403;
      throw err;
    }
  }

  const doc = await Message.create({
    workspaceId,
    roomId,
    sender: senderId,
    text: displayText,
    ...(attachment ? { attachment } : {}),
  });
  return Message.findById(doc._id).populate('sender', 'name avatar email').lean();
}

module.exports = { persistRoomMessage };
