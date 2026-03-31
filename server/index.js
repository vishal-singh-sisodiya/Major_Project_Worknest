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
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/users');

const Message = require('./models/Message');

const app = express();
const httpServer = http.createServer(app);
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: clientOrigin, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/workspaces', workspaceRoutes);
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

  socket.on('task-move', (payload) => {
    if (payload && payload.workspaceId) {
      socket.to('ws:' + payload.workspaceId).emit('task-moved', payload);
    }
  });

  socket.on('task-update', ({ workspaceId, task }) => {
    if (workspaceId) socket.to('ws:' + workspaceId).emit('task-updated', { task });
  });

  socket.on('task-create', ({ workspaceId, task }) => {
    if (workspaceId) socket.to('ws:' + workspaceId).emit('task-created', { task });
  });

  socket.on('task-delete', ({ workspaceId, taskId }) => {
    if (workspaceId) socket.to('ws:' + workspaceId).emit('task-deleted', { taskId });
  });

  socket.on('note-update', ({ workspaceId, note }) => {
    if (workspaceId) socket.to('ws:' + workspaceId).emit('note-updated', { note });
  });

  socket.on('send-message', async ({ workspaceId, message }) => {
    if (!workspaceId || !message || !message.text) return;
    try {
      const doc = await Message.create({
        workspaceId,
        sender: message.senderId || message.sender,
        text: message.text,
      });
      const populated = await Message.findById(doc._id)
        .populate('sender', 'name avatar')
        .lean();
      io.to('ws:' + workspaceId).emit('new-message', { message: populated });
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('typing', ({ workspaceId, userId, name }) => {
    if (workspaceId) socket.to('ws:' + workspaceId).emit('user-typing', { userId, name });
  });

  socket.on('stop-typing', ({ workspaceId, userId }) => {
    if (workspaceId) socket.to('ws:' + workspaceId).emit('stop-typing', { userId });
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
  .then(() => {
    httpServer.listen(PORT, () => console.log('WorkNest API on port', PORT));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
