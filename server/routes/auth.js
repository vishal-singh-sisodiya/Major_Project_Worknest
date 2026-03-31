const express = require('express');
const { body } = require('express-validator');
const auth = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  handleValidation,
  auth.register
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  handleValidation,
  auth.login
);

router.get('/me', verifyToken, auth.getMe);

module.exports = router;
