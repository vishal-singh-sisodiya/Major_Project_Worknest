const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    workspaces: [
      {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
        role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
      },
    ],
    pomodoroSettings: {
      workMinutes: { type: Number, default: 25 },
      breakMinutes: { type: Number, default: 5 },
      longBreakMinutes: { type: Number, default: 15 },
    },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
