const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['todo', 'inprogress', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    /** @deprecated synced with assignedTo for backward compatibility */
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** If empty, all project members can see the task */
    visibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dueDate: { type: Date },
    tags: [{ type: String }],
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    order: { type: Number, default: 0 },
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

taskSchema.pre('save', function syncAssignees(next) {
  if (this.isModified('assignedTo') || (this.isNew && this.assignedTo?.length)) {
    this.assignees = this.assignedTo || [];
  } else if (this.isModified('assignees') && (!this.assignedTo || this.assignedTo.length === 0)) {
    this.assignedTo = this.assignees || [];
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
