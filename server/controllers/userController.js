const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function search(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json([]);
    }
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const users = await User.find({
      $or: [{ name: regex }, { email: regex }],
    })
      .select('name email avatar')
      .limit(20)
      .lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, avatar, pomodoroSettings, theme, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (pomodoroSettings) {
      if (pomodoroSettings.workMinutes != null) {
        user.pomodoroSettings.workMinutes = Number(pomodoroSettings.workMinutes);
      }
      if (pomodoroSettings.breakMinutes != null) {
        user.pomodoroSettings.breakMinutes = Number(pomodoroSettings.breakMinutes);
      }
    }
    if (theme && ['dark', 'light'].includes(theme)) user.theme = theme;

    if (newPassword) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ message: 'Current password incorrect' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    const safe = await User.findById(req.userId).select('-password').lean();
    res.json(safe);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

module.exports = { search, updateProfile };
