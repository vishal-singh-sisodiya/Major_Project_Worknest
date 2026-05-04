const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    /** Optional — when set, message is scoped to project chat inside workspace */
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', sparse: true },
    /** Channel / DM room id — e.g. channel_<wid>_<slug> or dm_<wid>_<user>_<user> */
    roomId: { type: String, trim: true, index: true, sparse: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
    attachment: {
      data: { type: String },
      type: { type: String, default: '' },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

messageSchema.index({ workspaceId: 1, createdAt: -1 });
messageSchema.index({ workspaceId: 1, roomId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
