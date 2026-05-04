const express = require('express');
const { body, param } = require('express-validator');
const project = require('../controllers/projectController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(verifyToken);

router.get(
  '/workspace/:workspaceId',
  param('workspaceId').isMongoId(),
  handleValidation,
  project.listForWorkspace
);

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('workspaceId').isMongoId(),
    body('color').optional().isString(),
    body('icon').optional().isString(),
  ],
  handleValidation,
  project.createProject
);

/** Detail payload (tasks, activity, membership) — /detail kept for backwards compatibility */
router.get('/:projectId/detail', param('projectId').isMongoId(), handleValidation, project.detail);
/** REST-style project load (same handler as detail) */
router.get('/:projectId', param('projectId').isMongoId(), handleValidation, project.detail);


router.put('/:id', param('id').isMongoId(), handleValidation, project.updateProject);

router.delete('/:id', param('id').isMongoId(), handleValidation, project.remove);

router.post('/:id/join', param('id').isMongoId(), handleValidation, project.joinProjectReq);

router.post(
  '/:id/members',
  param('id').isMongoId(),
  body('userId').isMongoId(),
  body('role').optional().isIn(['manager', 'member', 'viewer']),
  handleValidation,
  project.addMember
);

router.put(
  '/:id/members/:userId',
  param('id').isMongoId(),
  param('userId').isMongoId(),
  body('role').isIn(['manager', 'member', 'viewer']),
  handleValidation,
  project.updateMember
);

router.delete(
  '/:id/members/:userId',
  param('id').isMongoId(),
  param('userId').isMongoId(),
  handleValidation,
  project.removeMember
);

module.exports = router;
