const Note = require('../models/Note');
const { isUserInWorkspace } = require('../utils/workspaceAccess');

async function listByWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;
    if (!(await isUserInWorkspace(req.userId, workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const notes = await Note.find({ workspaceId })
      .populate('createdBy', 'name avatar')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(notes);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function create(req, res) {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId || !(await isUserInWorkspace(req.userId, workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const note = await Note.create({
      ...req.body,
      createdBy: req.userId,
    });
    const populated = await Note.findById(note._id)
      .populate('createdBy', 'name avatar')
      .lean();
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function update(req, res) {
  try {
    const note = await Note.findById(req.params.id).lean();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (!(await isUserInWorkspace(req.userId, note.workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const allowed = ['title', 'content', 'emoji', 'color', 'tags'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updatedAt = new Date();
    const updated = await Note.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('createdBy', 'name avatar')
      .lean();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  try {
    const note = await Note.findById(req.params.id).lean();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (!(await isUserInWorkspace(req.userId, note.workspaceId))) {
      return res.status(403).json({ message: 'Not a member' });
    }
    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = { listByWorkspace, create, update, remove };
