const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');

function isOid(s) {
  return typeof s === 'string' && mongoose.Types.ObjectId.isValid(s);
}

/** channel_<workspaceId>_<slug> where slug is [a-z0-9-]+ */
function parseChannelRoom(roomId) {
  if (!roomId || typeof roomId !== 'string') return null;
  const m = roomId.match(/^channel_([a-f0-9]{24})_([a-z0-9][a-z0-9-]{0,39})$/i);
  if (!m) return null;
  const workspaceId = m[1];
  const slug = m[2].toLowerCase();
  return { type: 'channel', workspaceId, slug, roomId };
}

/** dm_<workspaceId>_<sortedUserHex>_<sortedUserHex> */
function parseDmRoom(roomId) {
  if (!roomId || typeof roomId !== 'string') return null;
  const m = roomId.match(/^dm_([a-f0-9]{24})_([a-f0-9]{24})_([a-f0-9]{24})$/i);
  if (!m) return null;
  const [_, workspaceId, a, b] = m;
  if (a > b) return null;
  return { type: 'dm', workspaceId, peerA: a, peerB: b, roomId };
}

function parseRoom(roomId) {
  return parseDmRoom(roomId) || parseChannelRoom(roomId);
}

/** True if workspace lists this channel slug (or slug is legacy default). */
function defaultSlugs() {
  return new Set(['general', 'announcements']);
}

async function assertChannelAllowed(workspaceId, slug) {
  const ws = await Workspace.findById(workspaceId).select('chatChannels').lean();
  if (!ws) return { ok: false, reason: 'Workspace not found' };
  const ch = ws.chatChannels || [];
  const has = ch.some((c) => c.slug === slug) || defaultSlugs().has(slug);
  if (!has) return { ok: false, reason: 'Unknown channel' };
  return { ok: true };
}

async function workspaceHasMember(workspaceId, userId) {
  if (!userId || !workspaceId || !isOid(workspaceId)) return false;
  const uid = String(userId);
  const ws = await Workspace.findById(workspaceId).select('members owner').lean();
  if (!ws) return false;
  if (ws.owner && String(ws.owner) === uid) return true;
  return (ws.members || []).some((m) => m.user && String(m.user) === uid);
}

async function assertDmAllowed(workspaceId, userId, peerA, peerB) {
  const u = String(userId);
  const a = peerA.toLowerCase();
  const b = peerB.toLowerCase();
  if (a === b) return { ok: false, reason: 'Invalid DM peers' };
  if (u !== a && u !== b) return { ok: false, reason: 'Not a DM participant' };
  const wa = await workspaceHasMember(workspaceId, peerA);
  const wb = await workspaceHasMember(workspaceId, peerB);
  if (!wa || !wb) return { ok: false, reason: 'Users must belong to workspace' };
  return { ok: true };
}

function buildDmRoomId(workspaceId, userIdA, userIdB) {
  const ws = String(workspaceId);
  const [x, y] = [String(userIdA), String(userIdB)].sort();
  return `dm_${ws}_${x}_${y}`;
}

function buildChannelRoomId(workspaceId, slug) {
  return `channel_${String(workspaceId)}_${String(slug).toLowerCase()}`;
}

module.exports = {
  parseRoom,
  parseChannelRoom,
  parseDmRoom,
  assertChannelAllowed,
  assertDmAllowed,
  workspaceHasMember,
  buildDmRoomId,
  buildChannelRoomId,
  defaultSlugs,
};
