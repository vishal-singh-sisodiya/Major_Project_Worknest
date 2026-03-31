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
    const user = await User.findById(decoded.userId).select('-password').lean();
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    next(e);
  }
}

module.exports = { verifyToken };
