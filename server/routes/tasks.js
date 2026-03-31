const express = require('express');
const { body, param } = require('express-validator');
const task = require('../controllers/taskController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(verifyToken);

router.get('/:workspaceId', param('workspaceId').isMongoId(), handleValidation, task.listByWorkspace);

router.post(
  '/',
  [body('workspaceId').isMongoId(), body('title').trim().notEmpty()],
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
