const express = require('express');
const { body, param } = require('express-validator');
const ws = require('../controllers/workspaceController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(verifyToken);

router.get('/my', ws.myWorkspaces);
router.post('/', [body('name').trim().notEmpty()], handleValidation, ws.create);
router.post('/join', [body('inviteCode').trim().notEmpty()], handleValidation, ws.join);
router.post(
  '/:id/channels',
  [param('id').isMongoId(), body('name').trim().notEmpty()],
  handleValidation,
  ws.addChatChannel
);
router.get('/:id/messages', param('id').isMongoId(), handleValidation, ws.listMessages);
router.get('/:id', param('id').isMongoId(), handleValidation, ws.getById);
router.put('/:id', param('id').isMongoId(), handleValidation, ws.updateWorkspace);
router.put(
  '/:id/members/:uid',
  [
    param('id').isMongoId(),
    param('uid').isMongoId(),
    body('role').isIn(['admin', 'member', 'viewer']),
  ],
  handleValidation,
  ws.updateMemberRole
);
router.delete(
  '/:id/members/:uid',
  [param('id').isMongoId(), param('uid').isMongoId()],
  handleValidation,
  ws.removeMember
);
router.post('/:id/leave', param('id').isMongoId(), handleValidation, ws.leaveWorkspace);
router.delete('/:id', param('id').isMongoId(), handleValidation, ws.deleteWorkspace);

module.exports = router;
