const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const Task = require('../models/Task');
const {
  normId,
  mapWorkspaceRoleToProjectRole,
} = require('../utils/projectAccess');

/**
 * Ensures each workspace has a "General" project and all tasks carry projectId.
 * Idempotent — safe to run on every startup.
 */
async function migrateProjects() {
  const workspaces = await Workspace.find().lean();
  let created = 0;
  let updatedTasks = 0;

  for (const ws of workspaces) {
    const wid = ws._id;
    let general = await Project.findOne({
      workspaceId: wid,
      name: 'General',
    }).lean();

    if (!general) {
      const seen = new Set();
      const members = [];
      for (const m of ws.members || []) {
        const id = normId(m.user);
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
        description: 'Default project (migrated)',
        workspaceId: wid,
        members,
        createdBy: ws.owner,
        color: '#6c63ff',
        icon: '',
        status: 'active',
      });
      general = doc.toObject();
      await Workspace.updateOne({ _id: wid }, { $addToSet: { projects: doc._id } });
      created += 1;
    } else if (!(ws.projects || []).some((p) => normId(p) === normId(general._id))) {
      await Workspace.updateOne({ _id: wid }, { $addToSet: { projects: general._id } });
    }

    const genId = general._id;

    const taskRes = await Task.updateMany(
      {
        workspaceId: wid,
        $or: [{ projectId: { $exists: false } }, { projectId: null }],
      },
      { $set: { projectId: genId } }
    );
    updatedTasks += taskRes.modifiedCount || 0;

    const noAssigned = await Task.find({
      workspaceId: wid,
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: [] },
      ],
      assignees: { $exists: true, $not: { $size: 0 } },
    })
      .select('_id assignees')
      .lean();

    for (const t of noAssigned) {
      await Task.updateOne(
        { _id: t._id },
        {
          $set: {
            assignedTo: (t.assignees || []).slice(),
          },
        }
      );
    }
  }

  if (created || updatedTasks) {
    console.log(
      `[migrateProjects] ensured General projects created=${created} tasksLinked=${updatedTasks}`
    );
  }
}

module.exports = { migrateProjects };
