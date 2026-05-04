const express = require('express');
const { body } = require('express-validator');
const ai = require('../controllers/aiController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(verifyToken);

router.post('/summarize', [body('content').notEmpty()], handleValidation, ai.summarize);
router.post('/suggest-tasks', ai.suggestTasks);
router.post('/plan-day', ai.planDay);
router.post('/prioritize', ai.prioritize);
router.post(
  '/chat',
  [body('message').trim().notEmpty(), body('workspaceId').isMongoId()],
  handleValidation,
  ai.chat
);

module.exports = router;
