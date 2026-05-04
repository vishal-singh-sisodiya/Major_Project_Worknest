function normId(id) {
  if (id == null) return '';
  return id.toString();
}

/** Normalize user ref from Project/Workspace.members (ObjectId or populated `{ _id }`). */
function normMemberUser(userRef) {
  if (userRef == null) return '';
  if (typeof userRef === 'object' && userRef._id != null) return normId(userRef._id);
  return normId(userRef);
}

function mapWorkspaceRoleToProjectRole(wsRole) {
  const r = (wsRole || 'member').toLowerCase();
  if (r === 'admin') return 'manager';
  if (r === 'viewer') return 'viewer';
  return 'member';
}

/** Workspace role helper (delegates pattern from workspace.members / user.workspaces). */
async function getUserWorkspaceRole(userId, workspaceId) {
  const { getUserWorkspaceRole: g } = require('./workspaceAccess');
  return g(userId, workspaceId);
}

/**
 * Resolve project role for user. Returns null if not a project member.
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @param {{ members?: { user?: unknown; role?: string }[] }} projectLean
 */
function getProjectRoleFromDoc(userId, projectLean) {
  const uid = normId(userId);
  const m = (projectLean?.members || []).find((x) => normMemberUser(x.user) === uid);
  return m?.role || null;
}

/**
 * Viewer: read only.
 * Member: create/edit tasks (not membership).
 * Manager: full project + members.
 */
function canEditTasks(projectRole) {
  return projectRole === 'member' || projectRole === 'manager';
}

function canManageMembers(projectRole) {
  return projectRole === 'manager';
}

/** Managers see every task in the project they belong to. */
function userCanSeeTask(userId, task, isProjectMember, projectRole = null) {
  const uid = normId(userId);
  if (!isProjectMember) {
    const assignees = task.assignedTo?.length ? task.assignedTo : task.assignees;
    return (assignees || []).some((id) => normId(id) === uid);
  }
  if (projectRole === 'manager') return true;

  const assignees = task.assignedTo?.length ? task.assignedTo : task.assignees || [];
  if (assignees.some((id) => normId(id) === uid)) return true;

  const vis = task.visibleTo;
  if (!vis || vis.length === 0) return true;
  return vis.some((id) => normId(id) === uid);
}

function filterTasksForUser(userId, tasks, projectMemberLookup, roleLookup) {
  return tasks.filter((t) =>
    userCanSeeTask(userId, t, !!projectMemberLookup?.(t.projectId?.toString?.() ?? String(t.projectId)), roleLookup?.[t.projectId?.toString?.()] ?? null)
  );
}

module.exports = {
  normId,
  normMemberUser,
  mapWorkspaceRoleToProjectRole,
  getUserWorkspaceRole,
  getProjectRoleFromDoc,
  canEditTasks,
  canManageMembers,
  userCanSeeTask,
  filterTasksForUser,
};
