const express = require('express');
const { body, param, check } = require('express-validator');
const msg = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(verifyToken);

router.get(
  '/:roomId',
  [param('roomId').isString().trim().notEmpty().isLength({ max: 400 })],
  handleValidation,
  msg.listByRoom
);
router.post(
  '/:roomId',
  [
    param('roomId').isString().trim().notEmpty().isLength({ max: 400 }),
    body('text').optional().trim().isLength({ max: 8000 }),
    check().custom((_, { req }) => {
      const t = (req.body?.text ?? '').toString().trim();
      const d = req.body?.attachment?.data;
      if (!t && !(typeof d === 'string' && d.length > 0)) {
        throw new Error('text or attachment required');
      }
      return true;
    }),
  ],
  handleValidation,
  msg.postToRoom
);

module.exports = router;
