const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const rawId = decoded.userId;
    const userIdNorm =
      rawId &&
      typeof rawId === 'object' &&
      rawId.toHexString &&
      typeof rawId.toHexString === 'function'
        ? rawId.toHexString()
        : String(rawId);
    const user = await User.findById(userIdNorm).select('-password').lean();
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    req.userId = userIdNorm;
    next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    next(e);
  }
}

module.exports = { verifyToken };
