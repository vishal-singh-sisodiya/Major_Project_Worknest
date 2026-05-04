/**
 * WorkNest database seed — wipes all app data and loads demo workspaces, projects, tasks, and notes.
 * Requires MONGO_URI in environment (see .env).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('./models/User');
const Workspace = require('./models/Workspace');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Note = require('./models/Note');
const Message = require('./models/Message');

const PASSWORD = '123456';
const SALT_ROUNDS = 10;

async function clearAll() {
  await Promise.all([
    Message.deleteMany({}),
    Task.deleteMany({}),
    Note.deleteMany({}),
    Project.deleteMany({}),
    Workspace.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log('Cleared: Messages, Tasks, Notes, Projects, Workspaces, Users');
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    console.error('FATAL: MONGO_URI is missing or empty. Set it in .env');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);
  console.log('Connecting to MongoDB…');
  await mongoose.connect(uri.trim());
  console.log('Connected.');

  const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  console.log('Wiping collections…');
  await clearAll();

  // --- Users ---
  const users = await User.create([
    {
      name: 'Vishal Singh Sisodiya',
      email: 'vishal@gmail.com',
      password: hashedPassword,
      avatar: 'VS',
      workspaces: [],
    },
    {
      name: 'Kunal Kumar Singh',
      email: 'kunal@gmail.com',
      password: hashedPassword,
      avatar: 'KK',
      workspaces: [],
    },
    {
      name: 'Hemant Bais',
      email: 'hemant@gmail.com',
      password: hashedPassword,
      avatar: 'HB',
      workspaces: [],
    },
    {
      name: 'Dharmendra Ahirwar',
      email: 'dharma@gmail.com',
      password: hashedPassword,
      avatar: 'DA',
      workspaces: [],
    },
  ]);

  const [vishal, kunal, hemant, dharmendra] = users;
  const ids = {
    vishal: vishal._id,
    kunal: kunal._id,
    hemant: hemant._id,
    dharmendra: dharmendra._id,
  };

  // --- Workspace 1: Team A ---
  const wsA = await Workspace.create({
    name: 'Team A',
    description: 'JacoShield Security Project',
    owner: ids.vishal,
    members: [
      { user: ids.vishal, role: 'admin' },
      { user: ids.kunal, role: 'member' },
    ],
    projects: [],
  });

  const projectA = await Project.create({
    name: 'JacoShield',
    description: 'JacoShield Security Project board',
    workspaceId: wsA._id,
    createdBy: ids.vishal,
    icon: '',
    color: '#6c63ff',
    members: [
      { user: ids.vishal, role: 'manager' },
      { user: ids.kunal, role: 'member' },
    ],
  });

  await Workspace.findByIdAndUpdate(wsA._id, { $set: { projects: [projectA._id] } });

  // --- Workspace 2: Team B ---
  const wsB = await Workspace.create({
    name: 'Team B',
    description: 'SWIM Server Identity Management',
    owner: ids.hemant,
    members: [
      { user: ids.hemant, role: 'admin' },
      { user: ids.dharmendra, role: 'member' },
    ],
    projects: [],
  });

  const projectB = await Project.create({
    name: 'SWIM',
    description: 'SWIM Server Identity Management board',
    workspaceId: wsB._id,
    createdBy: ids.hemant,
    icon: '',
    color: '#4338ca',
    members: [
      { user: ids.hemant, role: 'manager' },
      { user: ids.dharmendra, role: 'member' },
    ],
  });

  await Workspace.findByIdAndUpdate(wsB._id, { $set: { projects: [projectB._id] } });

  // --- Link users.workspaces ---
  await User.findByIdAndUpdate(ids.vishal, {
    workspaces: [{ workspaceId: wsA._id, role: 'admin' }],
  });
  await User.findByIdAndUpdate(ids.kunal, {
    workspaces: [{ workspaceId: wsA._id, role: 'member' }],
  });
  await User.findByIdAndUpdate(ids.hemant, {
    workspaces: [{ workspaceId: wsB._id, role: 'admin' }],
  });
  await User.findByIdAndUpdate(ids.dharmendra, {
    workspaces: [{ workspaceId: wsB._id, role: 'member' }],
  });

  // --- Tasks Team A ---
  await Task.insertMany([
    {
      title: 'Implement Authentication System',
      description:
        'Add JWT-based login and registration, encrypt passwords using bcrypt, handle token verification middleware',
      status: 'done',
      priority: 'high',
      assignedTo: [ids.vishal],
      assignees: [ids.vishal],
      workspaceId: wsA._id,
      projectId: projectA._id,
      createdBy: ids.vishal,
      dueDate: new Date('2026-04-10'),
      order: 0,
    },
    {
      title: 'Build Role-Based Access Control',
      description:
        'Define roles Admin and User, restrict routes based on permissions, middleware for role validation',
      status: 'inprogress',
      priority: 'high',
      assignedTo: [ids.kunal],
      assignees: [ids.kunal],
      workspaceId: wsA._id,
      projectId: projectA._id,
      createdBy: ids.vishal,
      dueDate: new Date('2026-05-15'),
      order: 1,
    },
    {
      title: 'Threat Detection Module',
      description: 'Monitor suspicious API activity, log unusual login attempts, create alert system',
      status: 'inprogress',
      priority: 'medium',
      assignedTo: [ids.vishal],
      assignees: [ids.vishal],
      workspaceId: wsA._id,
      projectId: projectA._id,
      createdBy: ids.vishal,
      dueDate: new Date('2026-05-20'),
      order: 2,
    },
    {
      title: 'Security Dashboard UI',
      description:
        'Show logs and alerts, add charts for threat analysis, dark theme with real-time updates',
      status: 'todo',
      priority: 'medium',
      assignedTo: [ids.kunal],
      assignees: [ids.kunal],
      workspaceId: wsA._id,
      projectId: projectA._id,
      createdBy: ids.kunal,
      dueDate: new Date('2026-06-01'),
      order: 3,
    },
  ]);

  // --- Tasks Team B ---
  await Task.insertMany([
    {
      title: 'Database Integration',
      description:
        'Connect to MongoDB, define schemas for users and certificates, optimize queries with indexes',
      status: 'done',
      priority: 'high',
      assignedTo: [ids.hemant],
      assignees: [ids.hemant],
      workspaceId: wsB._id,
      projectId: projectB._id,
      createdBy: ids.hemant,
      dueDate: new Date('2026-04-05'),
      order: 0,
    },
    {
      title: 'API Development',
      description:
        'Create REST APIs for user and system operations, implement validation and error handling, secure all endpoints',
      status: 'inprogress',
      priority: 'high',
      assignedTo: [ids.dharmendra],
      assignees: [ids.dharmendra],
      workspaceId: wsB._id,
      projectId: projectB._id,
      createdBy: ids.hemant,
      dueDate: new Date('2026-05-18'),
      order: 1,
    },
    {
      title: 'Authentication and Authorization',
      description:
        'Implement secure login system, token-based authentication, role-based permissions for all routes',
      status: 'todo',
      priority: 'high',
      assignedTo: [ids.hemant],
      assignees: [ids.hemant],
      workspaceId: wsB._id,
      projectId: projectB._id,
      createdBy: ids.hemant,
      dueDate: new Date('2026-05-25'),
      order: 2,
    },
    {
      title: 'Server Monitoring and Logging',
      description:
        'Log all API requests, track server performance metrics, setup alert system for failures and downtime',
      status: 'todo',
      priority: 'medium',
      assignedTo: [ids.dharmendra],
      assignees: [ids.dharmendra],
      workspaceId: wsB._id,
      projectId: projectB._id,
      createdBy: ids.dharmendra,
      dueDate: new Date('2026-06-10'),
      order: 3,
    },
  ]);

  // --- Notes Team A ---
  await Note.insertMany([
    {
      title: 'JacoShield Architecture',
      content:
        'Security system uses JWT for auth, bcrypt for passwords, role-based middleware for access control. Threat detection monitors API calls and logs suspicious activity.',
      emoji: '',
      workspaceId: wsA._id,
      createdBy: ids.vishal,
      color: '#6c63ff',
    },
    {
      title: 'Security Best Practices',
      content:
        'Always hash passwords, never store plain text. Use HTTPS in production. Implement rate limiting on auth endpoints. Log all failed login attempts.',
      emoji: '',
      workspaceId: wsA._id,
      createdBy: ids.kunal,
      color: '#6c63ff',
    },
  ]);

  // --- Notes Team B ---
  await Note.insertMany([
    {
      title: 'SWIM Server Architecture',
      content:
        'Backend server handles identity management using REST APIs. PostgreSQL for certificates, MongoDB for user data. All endpoints secured with JWT.',
      emoji: '',
      workspaceId: wsB._id,
      createdBy: ids.hemant,
      color: '#4338ca',
    },
    {
      title: 'API Documentation',
      content:
        'Base URL: /api/v1. Auth endpoints: /login /register /refresh. User endpoints: /users /users/:id. All requests need Authorization Bearer token header.',
      emoji: '',
      workspaceId: wsB._id,
      createdBy: ids.dharmendra,
      color: '#4338ca',
    },
  ]);

  console.log('\nWorkNest seed completed successfully.\n');
  console.log('Every account uses password: 123456\n');
  console.log('Emails:');
  console.log('  • vishal@gmail.com   (Team A — admin)');
  console.log('  • kunal@gmail.com    (Team A — member)');
  console.log('  • hemant@gmail.com   (Team B — admin)');
  console.log('  • dharma@gmail.com   (Team B — member)');
  console.log('\nWorkspaces: “Team A” (JacoShield), “Team B” (SWIM)');
  console.log('Workspace IDs (for localStorage):');
  console.log(`  Team A: ${wsA._id.toString()}`);
  console.log(`  Team B: ${wsB._id.toString()}\n`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    } catch (e) {
      console.error('Disconnect error:', e.message);
    }
  });
