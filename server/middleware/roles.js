const User = require('../models/User');

const order = { viewer: 0, member: 1, admin: 2 };

/**
 * Ensures user has at least minRole in workspace.
 * workspaceId from req.params.id or req.body.workspaceId
 */
function checkRole(minRole) {
  return async function (req, res, next) {
    try {
      const workspaceId = req.params.id || req.body.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ message: 'Workspace context required' });
      }
      const user = await User.findById(req.userId).lean();
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      const entry = (user.workspaces || []).find(
        (w) => w.workspaceId && w.workspaceId.toString() === workspaceId.toString()
      );
      if (!entry) {
        return res.status(403).json({ message: 'Not a member of this workspace' });
      }
      if (order[entry.role] < order[minRole]) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      req.workspaceRole = entry.role;
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { checkRole };
