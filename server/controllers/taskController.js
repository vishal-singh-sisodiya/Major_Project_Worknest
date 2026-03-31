const Task = require('../models/Task');
const User = require('../models/User');

async function userInWorkspace(userId, workspaceId) {
  const user = await User.findById(userId).lean();
  return (user.workspaces || []).some(
    (w) => w.workspaceId && w.workspaceId.toString() === workspaceId.toString()
  );
}

async function listByWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;
    if (!(await userInWorkspace(req.userId, workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const tasks = await Task.find({ workspaceId })
      .populate('assignees', 'name avatar email')
      .populate('createdBy', 'name avatar')
      .sort({ status: 1, order: 1 })
      .lean();
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function create(req, res) {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId || !(await userInWorkspace(req.userId, workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const status = req.body.status || 'todo';
    const maxOrder = await Task.findOne({ workspaceId, status })
      .sort({ order: -1 })
      .select('order')
      .lean();
    const order = (maxOrder && maxOrder.order != null ? maxOrder.order : -1) + 1;
    const task = await Task.create({
      ...req.body,
      createdBy: req.userId,
      order,
    });
    const populated = await Task.findById(task._id)
      .populate('assignees', 'name avatar')
      .populate('createdBy', 'name avatar')
      .lean();
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function update(req, res) {
  try {
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await userInWorkspace(req.userId, task.workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const allowed = [
      'title',
      'description',
      'status',
      'priority',
      'assignees',
      'dueDate',
      'tags',
    ];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('assignees', 'name avatar')
      .populate('createdBy', 'name avatar')
      .lean();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function move(req, res) {
  try {
    const { status, order } = req.body;
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await userInWorkspace(req.userId, task.workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { status, order: order != null ? order : task.order },
      { new: true }
    )
      .populate('assignees', 'name avatar')
      .lean();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  try {
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!(await userInWorkspace(req.userId, task.workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = { listByWorkspace, create, update, move, remove };
