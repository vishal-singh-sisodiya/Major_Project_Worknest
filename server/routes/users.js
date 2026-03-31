const express = require('express');
const { body } = require('express-validator');
const user = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();
router.use(verifyToken);

router.get('/search', user.search);

router.put(
  '/profile',
  [
    body('theme').optional().isIn(['dark', 'light']),
    body('newPassword').optional().isLength({ min: 6 }),
  ],
  handleValidation,
  user.updateProfile
);

module.exports = router;
