require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const noteRoutes = require('./routes/notes');
const workspaceRoutes = require('./routes/workspaces');
const projectRoutes = require('./routes/projects');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const { persistRoomMessage } = require('./utils/roomMessagePersist');

const Message = require('./models/Message');
const { migrateProjects } = require('./migrations/migrateProjects');
const { migrateChatChannels } = require('./migrations/migrateChatChannels');

const app = express();
const httpServer = http.createServer(app);

/** Comma-separated list for production (e.g. https://myapp.vercel.app,https://preview.vercel.app) */
function parseAllowedOrigins() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!list.length) return ['http://localhost:5173'];
  return list;
}

const allowedOrigins = parseAllowedOrigins();
const corsOrigin =
  allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins;

const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'], credentials: true },
  maxHttpBufferSize: 15e6,
});

app.set('io', io);

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '15mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

function roomUsers(workspaceId) {
  const room = io.sockets.adapter.rooms.get('ws:' + workspaceId);
  if (!room) return [];
  const users = [];
  const seen = new Set();
  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId);
    if (s && s.userData && !seen.has(s.userData.userId)) {
      seen.add(s.userData.userId);
      users.push(s.userData);
    }
  }
  return users;
}

io.on('connection', (socket) => {
  socket.on('join-workspace', ({ workspaceId, userId, name }) => {
    if (!workspaceId) return;
    socket.join('ws:' + workspaceId);
    socket.userData = { userId, name: name || 'User' };
    io.to('ws:' + workspaceId).emit('online-users', { users: roomUsers(workspaceId) });
  });

  socket.on('join-user', ({ userId }) => {
    if (userId) socket.join(`user:${userId}`);
  });

  socket.on('join-project', ({ projectId }) => {
    if (projectId) socket.join('proj:' + projectId);
  });

  socket.on('join-room', (roomId) => {
    if (typeof roomId === 'string' && roomId.length > 0 && roomId.length < 450) {
      socket.join(roomId);
    }
  });

  socket.on('leave-room', (roomId) => {
    if (typeof roomId === 'string') socket.leave(roomId);
  });

  socket.on('task-move', (payload) => {
    if (payload && payload.workspaceId) {
      io.to('ws:' + payload.workspaceId).emit('task-moved', payload);
      if (payload.projectId) {
        io.to('proj:' + payload.projectId).emit('task-moved', payload);
      }
    }
  });

  socket.on('task-update', ({ workspaceId, task }) => {
    if (!workspaceId) return;
    io.to(`ws:${workspaceId}`).emit('task-updated', { task });
    if (task?.projectId) io.to(`proj:${task.projectId}`).emit('task-updated', { task });
  });

  socket.on('task-create', ({ workspaceId, task }) => {
    if (!workspaceId) return;
    io.to(`ws:${workspaceId}`).emit('task-created', { task });
    if (task?.projectId) io.to(`proj:${task.projectId}`).emit('task-created', { task });
  });

  socket.on('task-delete', ({ workspaceId, taskId, projectId }) => {
    if (workspaceId) io.to(`ws:${workspaceId}`).emit('task-deleted', { taskId });
    if (projectId) io.to(`proj:${projectId}`).emit('task-deleted', { taskId });
  });

  socket.on('note-update', ({ workspaceId, note }) => {
    if (workspaceId) socket.to('ws:' + workspaceId).emit('note-updated', { note });
  });

  socket.on('send-message', async (payload) => {
    const { workspaceId, projectId, roomId, message } = payload || {};
    const hasBody =
      message &&
      (String(message.text || '').trim() ||
        (message.attachment && message.attachment.data));
    if (!message || !hasBody) return;
    const senderId =
      socket.userData?.userId || message.senderId || message.sender;
    if (!senderId) return;

    if (roomId) {
      try {
        const populated = await persistRoomMessage(
          roomId,
          senderId,
          message.text,
          message.attachment
        );
        io.to(roomId).emit('new-message', { message: populated });
      } catch (e) {
        console.error('room send-message', e.message);
      }
      return;
    }

    if (!workspaceId) return;
    try {
      const att = message.attachment;
      const doc = await Message.create({
        workspaceId,
        projectId: projectId || undefined,
        sender: senderId,
        text: String(message.text || '').trim() || (att ? `Attachment: ${att.name}` : ''),
        ...(att && att.data
          ? {
              attachment: {
                name: String(att.name || 'file').slice(0, 256),
                type: String(att.type || '').slice(0, 200),
                data: String(att.data).slice(0, 14 * 1024 * 1024),
              },
            }
          : {}),
      });
      const populated = await Message.findById(doc._id)
        .populate('sender', 'name avatar email')
        .lean();
      const evt = { message: populated };
      if (projectId) io.to(`proj:${projectId}`).emit('new-message', evt);
      else io.to(`ws:${workspaceId}`).emit('new-message', evt);
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('typing', (data) => {
    const { workspaceId, roomId, userId, name } = data || {};
    const uid = socket.userData?.userId;
    if (!uid || !userId || String(userId) !== String(uid)) return;
    const nm = name || socket.userData?.name || 'User';
    if (roomId && typeof roomId === 'string') {
      socket.to(roomId).emit('user-typing', { userId: uid, name: nm, roomId });
    } else if (workspaceId) {
      socket.to('ws:' + workspaceId).emit('user-typing', { userId: uid, name: nm });
    }
  });

  socket.on('stop-typing', (data) => {
    const { workspaceId, roomId, userId } = data || {};
    const uid = socket.userData?.userId;
    if (!uid || !userId || String(userId) !== String(uid)) return;
    if (roomId && typeof roomId === 'string') {
      socket.to(roomId).emit('stop-typing', { userId: uid, roomId });
    } else if (workspaceId) {
      socket.to('ws:' + workspaceId).emit('stop-typing', { userId: uid });
    }
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room.startsWith('ws:')) {
        const workspaceId = room.slice(3);
        setTimeout(() => {
          io.to(room).emit('online-users', { users: roomUsers(workspaceId) });
        }, 100);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => migrateProjects())
  .then(() => migrateChatChannels())
  .then(() => {
    httpServer.listen(PORT, () => console.log('WorkNest API on port', PORT));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
