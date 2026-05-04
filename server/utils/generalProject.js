const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const { getUserWorkspaceRole } = require('./workspaceAccess');
const {
  normId,
  normMemberUser,
  mapWorkspaceRoleToProjectRole,
  getProjectRoleFromDoc,
} = require('./projectAccess');

async function getGeneralProjectDoc(workspaceId) {
  return Project.findOne({
    workspaceId,
    name: 'General',
  });
}

/** Ensures a General project exists; links workspace; syncs workspace members missing from General. */
async function ensureGeneralProjectForWorkspace(workspaceId) {
  const wid = workspaceId;
  let general = await getGeneralProjectDoc(wid).lean();

  if (!general) {
    const ws = await Workspace.findById(wid).lean();
    if (!ws) return { project: null };
    const seen = new Set();
    const members = [];
    for (const m of ws.members || []) {
      const id = normMemberUser(m.user);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      members.push({
        user: m.user,
        role: mapWorkspaceRoleToProjectRole(m.role),
      });
    }
    if (!seen.has(normId(ws.owner))) {
      members.push({ user: ws.owner, role: 'manager' });
    }
    const doc = await Project.create({
      name: 'General',
      description: 'Inbox — tasks without a specific project',
      workspaceId: wid,
      members,
      createdBy: ws.owner,
      color: '#6c63ff',
      icon: '',
      status: 'active',
    });
    await Workspace.updateOne({ _id: wid }, { $addToSet: { projects: doc._id } });
    general = doc.toObject();
    return { project: general };
  }

  return { project: general };
}

/**
 * Workspace members can put tasks in "General" (no-project). Ensures they're on the member list.
 */
async function resolveGeneralProjectForTask(userId, workspaceId) {
  const wid = String(workspaceId);
  const { project: genLean } = await ensureGeneralProjectForWorkspace(wid);
  if (!genLean) return { project: null, role: null };

  const proj = await getGeneralProjectDoc(wid);
  if (!proj) return { project: null, role: null };

  const uid = normId(userId);
  const has = (proj.members || []).some((m) => normMemberUser(m.user) === uid);
  if (!has) {
    const wsRole = await getUserWorkspaceRole(userId, wid);
    if (!wsRole) return { project: null, role: null };
    const pr = mapWorkspaceRoleToProjectRole(wsRole);
    await Project.findByIdAndUpdate(proj._id, {
      $push: {
        members: { user: userId, role: pr === 'viewer' ? 'viewer' : 'member' },
      },
    });
  }

  const fresh = await Project.findById(proj._id).lean();
  const role = getProjectRoleFromDoc(userId, fresh);
  return { project: fresh, role };
}

module.exports = {
  getGeneralProjectDoc,
  ensureGeneralProjectForWorkspace,
  resolveGeneralProjectForTask,
};
