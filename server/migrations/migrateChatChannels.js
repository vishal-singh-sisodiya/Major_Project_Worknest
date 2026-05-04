const Workspace = require('../models/Workspace');

const DEFAULTS = [
  { slug: 'general', name: 'general' },
  { slug: 'announcements', name: 'announcements' },
];

/**
 * Ensures every workspace has default chat channels.
 * Idempotent — safe on every startup.
 */
async function migrateChatChannels() {
  const workspaces = await Workspace.find({}).select('chatChannels').lean();
  let updated = 0;
  for (const ws of workspaces) {
    const cur = ws.chatChannels || [];
    if (cur.length > 0) continue;
    await Workspace.updateOne(
      { _id: ws._id },
      { $set: { chatChannels: DEFAULTS } }
    );
    updated += 1;
  }
  if (updated) console.log(`[migrate] chatChannels: ${updated} workspace(s) updated`);
}

module.exports = { migrateChatChannels };
