const mongoose = require('mongoose');
const crypto = require('crypto');

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').slice(0, 8);
}

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
      },
    ],
    inviteCode: { type: String, unique: true, sparse: true },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    /** Slack-like channels — slugs joined as channel_<workspaceId>_<slug> */
    chatChannels: [
      {
        slug: { type: String, required: true, trim: true, lowercase: true },
        name: { type: String, required: true, trim: true },
      },
    ],
  },
  { timestamps: true }
);

workspaceSchema.pre('save', async function (next) {
  if (!this.inviteCode) {
    let code = generateInviteCode();
    const WorkspaceModel = this.constructor;
    let exists = await WorkspaceModel.findOne({ inviteCode: code }).lean();
    while (exists) {
      code = generateInviteCode();
      exists = await WorkspaceModel.findOne({ inviteCode: code }).lean();
    }
    this.inviteCode = code;
  }
  next();
});

module.exports = mongoose.model('Workspace', workspaceSchema);
