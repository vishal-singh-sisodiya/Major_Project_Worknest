const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    emoji: { type: String, default: '' },
    color: { type: String, default: '#6c63ff' },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

noteSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
