const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Task = require('../models/Task');
const Note = require('../models/Note');
const Message = require('../models/Message');

async function getUserWorkspaceRole(userId, workspaceId) {
  const user = await User.findById(userId).lean();
  const entry = (user.workspaces || []).find(
    (w) => w.workspaceId && w.workspaceId.toString() === workspaceId.toString()
  );
  return entry ? entry.role : null;
}

async function myWorkspaces(req, res) {
  try {
    const user = await User.findById(req.userId).lean();
    const ids = (user.workspaces || []).map((w) => w.workspaceId);
    const workspaces = await Workspace.find({ _id: { $in: ids } })
      .populate('owner', 'name avatar')
      .lean();
    const withRole = workspaces.map((ws) => {
      const entry = user.workspaces.find(
        (w) => w.workspaceId.toString() === ws._id.toString()
      );
      return { ...ws, myRole: entry && entry.role };
    });
    res.json(withRole);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function create(req, res) {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.create({
      name,
      description: description || '',
      owner: req.userId,
      members: [{ user: req.userId, role: 'admin' }],
    });
    await User.findByIdAndUpdate(req.userId, {
      $push: { workspaces: { workspaceId: workspace._id, role: 'admin' } },
    });
    const populated = await Workspace.findById(workspace._id)
      .populate('owner', 'name avatar')
      .lean();
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function join(req, res) {
  try {
    const { inviteCode } = req.body;
    const code = (inviteCode && inviteCode.toLowerCase) ? inviteCode.toLowerCase() : inviteCode;
    const workspace = await Workspace.findOne({ inviteCode: code }).lean();
    if (!workspace) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }
    const user = await User.findById(req.userId).lean();
    const already = (user.workspaces || []).some(
      (w) => w.workspaceId.toString() === workspace._id.toString()
    );
    if (already) {
      return res.status(400).json({ message: 'Already a member' });
    }
    await Workspace.findByIdAndUpdate(workspace._id, {
      $push: { members: { user: req.userId, role: 'member' } },
    });
    await User.findByIdAndUpdate(req.userId, {
      $push: { workspaces: { workspaceId: workspace._id, role: 'member' } },
    });
    const populated = await Workspace.findById(workspace._id)
      .populate('members.user', 'name avatar email')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function getById(req, res) {
  try {
    const ws = await Workspace.findById(req.params.id)
      .populate('owner', 'name avatar email')
      .populate('members.user', 'name avatar email')
      .lean();
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const role = await getUserWorkspaceRole(req.userId, req.params.id);
    if (!role) return res.status(403).json({ message: 'Not a member' });
    res.json({ ...ws, myRole: role });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function updateWorkspace(req, res) {
  try {
    const role = await getUserWorkspaceRole(req.userId, req.params.id);
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    const updated = await Workspace.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).lean();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function updateMemberRole(req, res) {
  try {
    const { id, uid } = req.params;
    const role = await getUserWorkspaceRole(req.userId, id);
    if (role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { role: newRole } = req.body;
    if (!['admin', 'member', 'viewer'].includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    await Workspace.findOneAndUpdate(
      { _id: id, 'members.user': uid },
      { $set: { 'members.$.role': newRole } }
    );
    await User.findOneAndUpdate(
      { _id: uid, 'workspaces.workspaceId': id },
      { $set: { 'workspaces.$.role': newRole } }
    );
    const ws = await Workspace.findById(id).populate('members.user', 'name avatar').lean();
    res.json(ws);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function removeMember(req, res) {
  try {
    const { id, uid } = req.params;
    const role = await getUserWorkspaceRole(req.userId, id);
    if (role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const ws = await Workspace.findById(id).lean();
    if (ws.owner.toString() === uid) {
      return res.status(400).json({ message: 'Cannot remove owner' });
    }
    await Workspace.findByIdAndUpdate(id, { $pull: { members: { user: uid } } });
    await User.findByIdAndUpdate(uid, { $pull: { workspaces: { workspaceId: id } } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function listMessages(req, res) {
  try {
    const role = await getUserWorkspaceRole(req.userId, req.params.id);
    if (!role) return res.status(403).json({ message: 'Not a member' });
    const messages = await Message.find({ workspaceId: req.params.id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    res.json(messages);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function leaveWorkspace(req, res) {
  try {
    const { id } = req.params;
    const ws = await Workspace.findById(id).lean();
    if (!ws) return res.status(404).json({ message: 'Not found' });
    if (ws.owner.toString() === req.userId) {
      return res.status(400).json({ message: 'Owner cannot leave; delete or transfer first' });
    }
    await Workspace.findByIdAndUpdate(id, { $pull: { members: { user: req.userId } } });
    await User.findByIdAndUpdate(req.userId, { $pull: { workspaces: { workspaceId: id } } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function deleteWorkspace(req, res) {
  try {
    const ws = await Workspace.findById(req.params.id).lean();
    if (!ws) return res.status(404).json({ message: 'Not found' });
    if (ws.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Owner only' });
    }
    await Workspace.findByIdAndDelete(req.params.id);
    await User.updateMany(
      { 'workspaces.workspaceId': req.params.id },
      { $pull: { workspaces: { workspaceId: req.params.id } } }
    );
    await Task.deleteMany({ workspaceId: req.params.id });
    await Note.deleteMany({ workspaceId: req.params.id });
    await Message.deleteMany({ workspaceId: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = {
  myWorkspaces,
  create,
  join,
  getById,
  updateWorkspace,
  updateMemberRole,
  removeMember,
  listMessages,
  leaveWorkspace,
  deleteWorkspace,
};
