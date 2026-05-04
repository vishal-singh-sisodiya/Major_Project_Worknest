const express = require('express');
const { body, param } = require('express-validator');
const task = require('../controllers/taskController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(verifyToken);

router.get(
  '/project/:projectId',
  param('projectId').isMongoId(),
  handleValidation,
  task.listByProject
);

router.put(
  '/:id/assign',
  [param('id').isMongoId(), body('assignedTo').isArray()],
  handleValidation,
  task.setAssign
);

router.put(
  '/:id/access',
  [
    param('id').isMongoId(),
    body('visibleTo').optional().isArray(),
    body('visibleTo.*').optional().isMongoId(),
    body('visibilityMode').optional().isIn(['all', 'specific']),
  ],
  handleValidation,
  task.setAccess
);

router.get('/:workspaceId', param('workspaceId').isMongoId(), handleValidation, task.listByWorkspace);

router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    /** Inbox task: omit projectId or send ""; server uses workspace "General". */
    body('projectId').optional({ checkFalsy: true }).isMongoId(),
    body('workspaceId').isMongoId(),
    body('visibilityMode').optional().isIn(['all', 'specific']),
  ],
  handleValidation,
  task.create
);

router.put('/:id', param('id').isMongoId(), handleValidation, task.update);

router.put(
  '/:id/move',
  [param('id').isMongoId(), body('status').isIn(['todo', 'inprogress', 'done'])],
  handleValidation,
  task.move
);

router.delete('/:id', param('id').isMongoId(), handleValidation, task.remove);

module.exports = router;
