const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

messageSchema.index({ workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
