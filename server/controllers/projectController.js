const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { isUserInWorkspace } = require('../utils/workspaceAccess');
const {
  getProjectRoleFromDoc,
  canManageMembers,
  getUserWorkspaceRole,
  normId,
  normMemberUser,
  userCanSeeTask,
} = require('../utils/projectAccess');

function attachIo(req) {
  return req.app?.get('io');
}

async function aggregateTaskStats(workspaceId) {
  const wid = new mongoose.Types.ObjectId(workspaceId);
  const rows = await Task.aggregate([
    { $match: { workspaceId: wid } },
    {
      $group: {
        _id: '$projectId',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
      },
    },
  ]);
  const map = {};
  for (const r of rows) {
    map[r._id.toString()] = { total: r.total, done: r.done };
  }
  return map;
}

async function listForWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;
    if (!(await isUserInWorkspace(req.userId, workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const stats = await aggregateTaskStats(workspaceId);
    const all = await Project.find({ workspaceId })
      .populate('members.user', 'name avatar email')
      .populate('createdBy', 'name avatar')
      .sort({ updatedAt: -1 })
      .lean();

    const mine = [];
    const discover = [];
    for (const p of all) {
      const s = stats[p._id.toString()] || { total: 0, done: 0 };
      const role = getProjectRoleFromDoc(req.userId, p);
      const card = {
        ...p,
        taskTotal: s.total,
        taskDone: s.done,
        ...(role ? { myRole: role } : {}),
      };
      if (role) mine.push(card);
      else discover.push(card);
    }
    res.json({ mine, discover });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function createProject(req, res) {
  try {
    const { name, description, color, icon, dueDate } = req.body;
    const { workspaceId } = req.body;
    if (!(await isUserInWorkspace(req.userId, workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description || '',
      workspaceId,
      members: [{ user: req.userId, role: 'manager' }],
      createdBy: req.userId,
      color: color || '#6c63ff',
      icon: icon || '',
      dueDate: dueDate || undefined,
      status: 'active',
    });

    await Workspace.findByIdAndUpdate(workspaceId, {
      $addToSet: { projects: project._id },
    });

    const populated = await Project.findById(project._id)
      .populate('members.user', 'name avatar email')
      .populate('createdBy', 'name avatar')
      .lean();

    const io = attachIo(req);
    if (io) io.to(`ws:${workspaceId}`).emit('project-updated', { projectId: project._id });

    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function detail(req, res) {
  try {
    const projectId = req.params.projectId || req.params.id;
    const project = await Project.findById(projectId)
      .populate('members.user', 'name avatar email')
      .populate('createdBy', 'name avatar')
      .lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!(await isUserInWorkspace(req.userId, project.workspaceId))) {
      return res.status(403).json({ message: 'Not a workspace member' });
    }

    const role = getProjectRoleFromDoc(req.userId, project);
    if (!role) {
      const preview = {
        _id: project._id,
        name: project.name,
        description: project.description || '',
        icon: project.icon,
        color: project.color,
        workspaceId: project.workspaceId,
        status: project.status,
      };
      return res.json({
        project: { ...preview, members: [] },
        tasks: [],
        activity: [],
        myRole: null,
        canManageMembers: false,
        needsJoin: true,
      });
    }

    let tasks = await Task.find({ projectId: project._id })
      .populate('assignedTo assignees createdBy', 'name avatar email')
      .sort({ status: 1, order: 1 })
      .lean();

    const isMember = true;
    tasks = tasks.filter((t) => userCanSeeTask(req.userId, t, isMember, role));

    const activity = [...tasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 30);

    res.json({
      project,
      tasks,
      activity,
      myRole: role,
      canManageMembers: canManageMembers(role),
      needsJoin: false,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function updateProject(req, res) {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const role = getProjectRoleFromDoc(req.userId, project);
    if (!canManageMembers(role)) {
      return res.status(403).json({ message: 'Managers only' });
    }

    const allowed = ['name', 'description', 'color', 'icon', 'status', 'dueDate'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const updated = await Project.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('members.user', 'name avatar email')
      .lean();

    const io = attachIo(req);
    if (io) io.to(`proj:${project._id}`).emit('project-updated', { project: updated });

    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const role = getProjectRoleFromDoc(req.userId, project);
    if (!canManageMembers(role)) {
      return res.status(403).json({ message: 'Managers only' });
    }

    await Task.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(project._id);
    await Workspace.findByIdAndUpdate(project.workspaceId, {
      $pull: { projects: project._id },
    });

    const io = attachIo(req);
    if (io)
      io.to(`ws:${project.workspaceId}`).emit('project-updated', {
        deletedProjectId: project._id.toString(),
      });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function joinProjectReq(req, res) {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    let wsRole = await getUserWorkspaceRole(req.userId, project.workspaceId);
    if (!(await isUserInWorkspace(req.userId, project.workspaceId))) {
      wsRole = null;
    }
    if (!wsRole) return res.status(403).json({ message: 'Join the workspace first' });

    const already = getProjectRoleFromDoc(req.userId, project);
    if (already) return res.status(400).json({ message: 'Already a project member' });

    const projRole = wsRole === 'viewer' ? 'viewer' : 'member';

    await Project.findByIdAndUpdate(project._id, {
      $push: { members: { user: req.userId, role: projRole } },
    });

    await Workspace.findByIdAndUpdate(project.workspaceId, {
      $addToSet: { projects: project._id },
    });

    const populated = await Project.findById(project._id)
      .populate('members.user', 'name avatar email')
      .lean();

    const io = attachIo(req);
    if (io) {
      io.to(`ws:${project.workspaceId}`).emit('member-added', {
        projectId: project._id.toString(),
        userId: req.userId,
      });
    }

    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function addMember(req, res) {
  try {
    const { userId, role } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const allowedRoles = ['manager', 'member', 'viewer'];
    const r = role && allowedRoles.includes(role) ? role : 'member';

    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const myRole = getProjectRoleFromDoc(req.userId, project);
    if (!canManageMembers(myRole)) return res.status(403).json({ message: 'Managers only' });

    if (!(await isUserInWorkspace(userId, project.workspaceId))) {
      return res.status(400).json({ message: 'User must be in the workspace first' });
    }

    const dup = project.members.some((m) => normMemberUser(m.user) === normId(userId));
    if (dup) return res.status(400).json({ message: 'User already in project' });

    await Project.findByIdAndUpdate(project._id, {
      $push: { members: { user: userId, role: r } },
    });

    const populated = await Project.findById(project._id)
      .populate('members.user', 'name avatar email')
      .lean();

    const io = attachIo(req);
    if (io) {
      io.to(`ws:${project.workspaceId}`).emit('member-added', {
        projectId: project._id.toString(),
        userId,
      });
    }

    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function updateMember(req, res) {
  try {
    const { role } = req.body;
    const allowedRoles = ['manager', 'member', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const uid = req.params.userId;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const myRole = getProjectRoleFromDoc(req.userId, project.toObject());
    if (!canManageMembers(myRole)) return res.status(403).json({ message: 'Managers only' });

    const ix = project.members.findIndex((m) => normMemberUser(m.user) === normId(uid));
    if (ix === -1) return res.status(404).json({ message: 'Member not in project' });

    const managers = project.members.filter((m) => m.role === 'manager');
    if (
      managers.length === 1 &&
      normMemberUser(managers[0].user) === normId(uid) &&
      role !== 'manager'
    ) {
      return res.status(400).json({ message: 'Keep at least one manager' });
    }

    project.members[ix].role = role;
    await project.save();

    const populated = await Project.findById(project._id)
      .populate('members.user', 'name avatar email')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function removeMember(req, res) {
  try {
    const uid = req.params.userId;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const myRole = getProjectRoleFromDoc(req.userId, project.toObject());
    if (!canManageMembers(myRole)) return res.status(403).json({ message: 'Managers only' });

    const m = project.members.find((x) => normMemberUser(x.user) === normId(uid));
    if (!m) return res.status(404).json({ message: 'Member not in project' });

    const managers = project.members.filter((x) => x.role === 'manager');
    if (managers.length === 1 && m.role === 'manager') {
      return res.status(400).json({ message: 'Cannot remove the last manager' });
    }

    project.members = project.members.filter((x) => normMemberUser(x.user) !== normId(uid));
    await project.save();

    const populated = await Project.findById(project._id)
      .populate('members.user', 'name avatar email')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = {
  listForWorkspace,
  createProject,
  detail,
  updateProject,
  remove,
  joinProjectReq,
  addMember,
  updateMember,
  removeMember,
};
