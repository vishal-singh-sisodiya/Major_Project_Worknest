const User = require('../models/User');
const Workspace = require('../models/Workspace');

function normId(id) {
  if (id == null) return '';
  return id.toString();
}

/** True if the user may access this workspace (User.workspaces OR Workspace.members). */
async function isUserInWorkspace(userId, workspaceId) {
  const wid = normId(workspaceId);
  const uid = normId(userId);
  if (!wid || !uid) return false;

  const user = await User.findById(userId).lean();
  if ((user?.workspaces || []).some((w) => w.workspaceId && normId(w.workspaceId) === wid)) {
    return true;
  }

  const ws = await Workspace.findById(wid).select('members').lean();
  return !!(ws?.members || []).some((m) => m.user && normId(m.user) === uid);
}

/** Role for RBAC: prefers User.workspaces entry, falls back to Workspace.members. */
async function getUserWorkspaceRole(userId, workspaceId) {
  const wid = normId(workspaceId);
  const uid = normId(userId);
  if (!wid || !uid) return null;

  const user = await User.findById(userId).lean();
  const entry = (user?.workspaces || []).find((w) => w.workspaceId && normId(w.workspaceId) === wid);
  if (entry?.role) return entry.role;

  const ws = await Workspace.findById(wid).select('members').lean();
  const m = (ws?.members || []).find((x) => x.user && normId(x.user) === uid);
  return m?.role || null;
}

module.exports = { isUserInWorkspace, getUserWorkspaceRole };
