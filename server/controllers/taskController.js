const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { isUserInWorkspace } = require('../utils/workspaceAccess');
const {
  getProjectRoleFromDoc,
  canEditTasks,
  userCanSeeTask,
} = require('../utils/projectAccess');
const { resolveGeneralProjectForTask } = require('../utils/generalProject');

async function projectRoleMapForUser(userId, projectIdList) {
  if (!projectIdList.length) return {};
  const oids = projectIdList.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const projs = await Project.find({
    _id: { $in: oids },
    'members.user': userId,
  }).lean();
  const m = {};
  for (const p of projs) {
    m[p._id.toString()] = getProjectRoleFromDoc(userId, p);
  }
  return m;
}

function io(req) {
  return req.app?.get('io');
}

async function resolveProjectMembership(userId, projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) return { project: null, role: null };
  const role = getProjectRoleFromDoc(userId, project);
  return { project, role };
}

/** IDs of projects the user belongs to in this workspace. */
async function userProjectIdsInWorkspace(userId, workspaceId) {
  const rows = await Project.find({
    workspaceId,
    'members.user': userId,
  })
    .select('_id')
    .lean();
  return new Set(rows.map((r) => r._id.toString()));
}

function populateTaskQuery(q) {
  return q
    .populate({ path: 'assignedTo', select: 'name avatar email' })
    .populate({ path: 'assignees', select: 'name avatar email' })
    .populate({ path: 'createdBy', select: 'name avatar' });
}

async function listByWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;
    if (!(await isUserInWorkspace(req.userId, workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const pids = await userProjectIdsInWorkspace(req.userId, workspaceId);
    const idList = [...pids].map((id) => id);
    if (!idList.length) {
      return res.json([]);
    }
    const tasks = await populateTaskQuery(
      Task.find({ workspaceId, projectId: { $in: idList } }).sort({ status: 1, order: 1 })
    ).lean();

    const roleMap = await projectRoleMapForUser(req.userId, idList);
    const filtered = tasks.filter((t) => {
      const pid = t.projectId.toString();
      return userCanSeeTask(req.userId, t, pids.has(pid), roleMap[pid]);
    });
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function listByProject(req, res) {
  try {
    const { projectId } = req.params;
    const { project, role } = await resolveProjectMembership(req.userId, projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!role) return res.status(403).json({ message: 'Not a project member' });

    const tasks = await populateTaskQuery(
      Task.find({ projectId }).sort({ status: 1, order: 1 })
    ).lean();

    const filtered = tasks.filter((t) => userCanSeeTask(req.userId, t, true, role));
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function create(req, res) {
  try {
    const rawPid = req.body.projectId;
    const hasProject =
      rawPid !== undefined &&
      rawPid !== null &&
      String(rawPid).trim() !== '' &&
      mongoose.Types.ObjectId.isValid(rawPid);

    const { workspaceId: bodyWid } = req.body;
    /** No project selected → workspace "General" (inbox) */
    let project;
    let role;
    let resolvedProjectId;

    if (!hasProject) {
      const wid = bodyWid;
      if (!wid || !mongoose.Types.ObjectId.isValid(String(wid))) {
        return res.status(400).json({ message: 'workspaceId is required when no project is set' });
      }
      if (!(await isUserInWorkspace(req.userId, wid))) {
        return res.status(403).json({ message: 'Not a workspace member' });
      }
      const inbox = await resolveGeneralProjectForTask(req.userId, wid);
      if (!inbox.project) {
        return res.status(500).json({ message: 'Workspace inbox project is not available yet' });
      }
      if (!inbox.role) {
        return res.status(403).json({ message: 'Not allowed for workspace inbox' });
      }
      if (!canEditTasks(inbox.role)) {
        return res.status(403).json({ message: 'Viewers cannot create tasks' });
      }
      project = inbox.project;
      role = inbox.role;
      resolvedProjectId = project._id;
    } else {
      resolvedProjectId = rawPid;
      const r = await resolveProjectMembership(req.userId, resolvedProjectId);
      project = r.project;
      role = r.role;
      if (!project) return res.status(404).json({ message: 'Project not found' });
      if (!role) return res.status(403).json({ message: 'Not a project member' });
      if (!canEditTasks(role)) {
        return res.status(403).json({ message: 'Viewers cannot create tasks' });
      }
      if (!(await isUserInWorkspace(req.userId, project.workspaceId))) {
        return res.status(403).json({ message: 'Not a member' });
      }
      if (bodyWid && bodyWid !== project.workspaceId.toString()) {
        return res.status(400).json({ message: 'workspaceId does not match project' });
      }
    }

    const status = req.body.status || 'todo';
    const maxOrder = await Task.findOne({
      projectId: resolvedProjectId,
      status,
    })
      .sort({ order: -1 })
      .select('order')
      .lean();
    const order = (maxOrder && maxOrder.order != null ? maxOrder.order : -1) + 1;

    const assignedRaw = req.body.assignedTo ?? req.body.assignees ?? [];
    const assignedTo = Array.isArray(assignedRaw) ? assignedRaw : [];
    let visibleRaw = req.body.visibleTo;
    const visibleMode = req.body.visibilityMode;
    if (visibleMode === 'all') visibleRaw = [];
    if (!Array.isArray(visibleRaw)) visibleRaw = visibleRaw ?? [];

    const task = await Task.create({
      title: req.body.title,
      description: req.body.description || '',
      workspaceId: project.workspaceId,
      projectId: resolvedProjectId,
      priority: req.body.priority || 'medium',
      status,
      assignedTo,
      assignees: assignedTo,
      visibleTo: visibleRaw,
      dueDate: req.body.dueDate || undefined,
      tags: req.body.tags || [],
      createdBy: req.userId,
      order,
    });

    const populated = await populateTaskQuery(Task.findById(task._id)).lean();

    io(req)?.to(`ws:${project.workspaceId}`).emit('task-created', { task: populated });
    io(req)?.to(`proj:${resolvedProjectId}`).emit('task-created', { task: populated });

    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function ensureTaskEditable(reqUserId, taskId) {
  const task = await Task.findById(taskId).lean();
  if (!task) return { error: 'notfound' };
  const { project, role } = await resolveProjectMembership(reqUserId, task.projectId);
  if (!project) return { error: 'notfound' };
  if (!role) return { error: 'project' };
  if (!userCanSeeTask(reqUserId, task, true, role)) return { error: 'forbidden' };
  return { task, project, role };
}

async function update(req, res) {
  try {
    const chk = await ensureTaskEditable(req.userId, req.params.id);
    if (chk.error === 'notfound') return res.status(404).json({ message: 'Task not found' });
    if (chk.error) return res.status(403).json({ message: 'Forbidden' });
    if (!canEditTasks(chk.role)) {
      return res.status(403).json({ message: 'Viewers cannot edit tasks' });
    }

    const allowed = [
      'title',
      'description',
      'status',
      'priority',
      'dueDate',
      'tags',
      'projectId',
    ];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (req.body.assignedTo !== undefined) {
      const memberIds = new Set(chk.project.members.map((m) => m.user?.toString()).filter(Boolean));
      const assign = Array.isArray(req.body.assignedTo) ? req.body.assignedTo : [];
      const badAssign = assign.some((id) => !memberIds.has(id?.toString?.()));
      if (badAssign) return res.status(400).json({ message: 'Assignees must be project members' });
      updates.assignedTo = assign;
      updates.assignees = assign;
    }
    if (req.body.assignees !== undefined && req.body.assignedTo === undefined) {
      updates.assignees = req.body.assignees;
      updates.assignedTo = req.body.assignees;
    }
    if (req.body.visibilityMode === 'all') {
      updates.visibleTo = [];
    } else if (req.body.visibleTo !== undefined) {
      updates.visibleTo = req.body.visibleTo;
    }
    if (updates.visibleTo) {
      const memberIds = new Set(chk.project.members.map((m) => m.user?.toString()).filter(Boolean));
      const ok = (updates.visibleTo || []).every((id) => memberIds.has(id?.toString?.()));
      if (!ok) return res.status(400).json({ message: 'visibility must reference project members' });
    }

    /** Project change: validate membership */
    if (updates.projectId) {
      const { project, role: r2 } = await resolveProjectMembership(req.userId, updates.projectId);
      if (!project) return res.status(400).json({ message: 'Invalid project' });
      if (!canEditTasks(r2)) return res.status(403).json({ message: 'Cannot move to this project' });
      updates.workspaceId = project.workspaceId;
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });
    const populated = await populateTaskQuery(Task.findById(updated._id)).lean();

    io(req)?.to(`ws:${populated.workspaceId}`).emit('task-updated', { task: populated });
    io(req)?.to(`proj:${populated.projectId}`).emit('task-updated', { task: populated });

    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function move(req, res) {
  try {
    const { status, order } = req.body;
    const chk = await ensureTaskEditable(req.userId, req.params.id);
    if (chk.error === 'notfound') return res.status(404).json({ message: 'Task not found' });
    if (chk.error) return res.status(403).json({ message: 'Forbidden' });
    if (!canEditTasks(chk.role)) {
      return res.status(403).json({ message: 'Viewers cannot move tasks' });
    }

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { status, order: order != null ? order : chk.task.order },
      { new: true }
    ).lean();

    const populated = await populateTaskQuery(Task.findById(updated._id)).lean();

    io(req)?.to(`ws:${populated.workspaceId}`).emit('task-moved', {
      workspaceId: populated.workspaceId.toString(),
      projectId: populated.projectId.toString(),
      taskId: populated._id.toString(),
      status,
      order,
    });
    io(req)?.to(`proj:${populated.projectId}`).emit('task-moved', {
      workspaceId: populated.workspaceId.toString(),
      projectId: populated.projectId.toString(),
      taskId: populated._id.toString(),
      status,
    });

    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function setAssign(req, res) {
  try {
    const { assignedTo } = req.body;
    if (!Array.isArray(assignedTo)) {
      return res.status(400).json({ message: 'assignedTo must be an array of user ids' });
    }
    const chk = await ensureTaskEditable(req.userId, req.params.id);
    if (chk.error === 'notfound') return res.status(404).json({ message: 'Task not found' });
    if (chk.error) return res.status(403).json({ message: 'Forbidden' });
    if (!canEditTasks(chk.role)) return res.status(403).json({ message: 'Viewers cannot assign' });

    const memberIds = new Set(
      chk.project.members.map((m) => m.user?.toString()).filter(Boolean)
    );
    const bad = assignedTo.some((id) => !memberIds.has(id?.toString?.()));
    if (bad) {
      return res.status(400).json({ message: 'Assignees must be project members' });
    }

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { assignedTo, assignees: assignedTo },
      { new: true }
    ).lean();
    const populated = await populateTaskQuery(Task.findById(updated._id)).lean();

    const i = io(req);
    if (i) {
      i.to(`ws:${chk.project.workspaceId}`).emit('task-assigned', {
        taskId: populated._id.toString(),
        assignedTo,
        projectId: chk.project._id.toString(),
      });
      assignedTo.forEach((uid) => {
        i.to(`user:${uid}`).emit('task-assigned', {
          taskId: populated._id.toString(),
          assignedTo,
        });
      });
    }

    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function setAccess(req, res) {
  try {
    const { visibleTo, visibilityMode } = req.body;
    const chk = await ensureTaskEditable(req.userId, req.params.id);
    if (chk.error === 'notfound') return res.status(404).json({ message: 'Task not found' });
    if (chk.error) return res.status(403).json({ message: 'Forbidden' });
    if (!canEditTasks(chk.role)) return res.status(403).json({ message: 'Viewers cannot change access' });

    let vt = visibilityMode === 'all' ? [] : visibleTo;
    if (!Array.isArray(vt)) vt = [];

    const memberIds = new Set(chk.project.members.map((m) => m.user?.toString()).filter(Boolean));
    const ok = vt.every((id) => memberIds.has(id?.toString?.()));
    if (!ok) return res.status(400).json({ message: 'visibleTo must reference project members' });

    const updated = await Task.findByIdAndUpdate(req.params.id, { visibleTo: vt }, { new: true }).lean();
    const populated = await populateTaskQuery(Task.findById(updated._id)).lean();

    io(req)?.to(`proj:${chk.project._id}`).emit('task-updated', { task: populated });

    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  try {
    const chk = await ensureTaskEditable(req.userId, req.params.id);
    if (chk.error === 'notfound') return res.status(404).json({ message: 'Task not found' });
    if (chk.error) return res.status(403).json({ message: 'Forbidden' });
    if (!canEditTasks(chk.role)) return res.status(403).json({ message: 'Viewers cannot delete' });

    await Task.findByIdAndDelete(req.params.id);
    io(req)?.to(`ws:${chk.task.workspaceId}`).emit('task-deleted', { taskId: req.params.id });
    io(req)?.to(`proj:${chk.task.projectId}`).emit('task-deleted', { taskId: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = {
  listByWorkspace,
  listByProject,
  create,
  update,
  move,
  setAssign,
  setAccess,
  remove,
};
