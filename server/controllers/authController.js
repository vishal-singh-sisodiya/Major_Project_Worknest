const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');

function initialsAvatar(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const avatar = initialsAvatar(name);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      avatar,
    });

    const workspace = await Workspace.create({
      name: `${name}'s Workspace`,
      description: 'Personal workspace',
      owner: user._id,
      members: [{ user: user._id, role: 'admin' }],
    });

    await User.findByIdAndUpdate(user._id, {
      $push: { workspaces: { workspaceId: workspace._id, role: 'admin' } },
    });

    const populated = await User.findById(user._id).select('-password').lean();
    const token = signToken(user._id);
    res.status(201).json({ token, user: populated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    const safe = await User.findById(user._id).select('-password').lean();
    res.json({ token, user: safe });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Login failed' });
  }
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.userId).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = { register, login, getMe };
