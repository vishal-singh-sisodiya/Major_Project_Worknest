const mongoose = require('mongoose');
const Groq = require('groq-sdk');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { isUserInWorkspace } = require('../utils/workspaceAccess');
const { getProjectRoleFromDoc, filterTasksForUser } = require('../utils/projectAccess');

const MODEL = 'llama-3.1-8b-instant';

let groqClient;
function getGroq() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

async function complete(system, userMessage, maxTokens = 2048) {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

async function projectRoleMapForUser(userId, projectIdList) {
  const oids = projectIdList.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const projs = await Project.find({
    _id: { $in: oids },
    'members.user': userId,
  }).lean();
  const m = {};
  for (const p of projs) {
    m[p._id.toString()] = getProjectRoleFromDoc(userId, p);
  }
  return m;
}

function assigneeLine(task) {
  const arr = task.assignedTo?.length ? task.assignedTo : task.assignees || [];
  if (!arr.length) return 'unassigned';
  const names = arr
    .map((u) => (u && typeof u === 'object' && u.name ? u.name : ''))
    .filter(Boolean);
  return names.length ? names.join(', ') : 'unassigned';
}

async function summarize(req, res) {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'content required' });
    const text = await complete(
      'Summarize the following as concise bullet points only.',
      String(content).slice(0, 50000)
    );
    res.json({ summary: text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'AI error' });
  }
}

async function suggestTasks(req, res) {
  try {
    const { projectName, description } = req.body;
    const prompt = `Project: ${projectName || 'Untitled'}\nDescription: ${description || ''}\n\nReturn JSON array of strings only — task titles. No markdown.`;
    const text = await complete('Output only a JSON array of strings.', prompt);
    let arr = [];
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      arr = text.split('\n').filter((l) => l.trim()).slice(0, 10);
    }
    res.json({ tasks: arr });
  } catch (e) {
    res.status(500).json({ message: e.message || 'AI error' });
  }
}

async function planDay(req, res) {
  try {
    const { tasks } = req.body;
    const list = Array.isArray(tasks) ? tasks : [];
    const prompt = `Tasks:\n${JSON.stringify(list)}\n\nPrioritized daily schedule as numbered list. Plain text.`;
    const text = await complete('You are a productivity planner.', prompt);
    res.json({ plan: text });
  } catch (e) {
    res.status(500).json({ message: e.message || 'AI error' });
  }
}

async function prioritize(req, res) {
  try {
    const { tasks } = req.body;
    const list = Array.isArray(tasks) ? tasks : [];
    const prompt = `Tasks:\n${JSON.stringify(list)}\n\nReturn JSON array of { "title": string, "reason": string }. No markdown.`;
    const text = await complete('Output only valid JSON array.', prompt);
    let ranked = [];
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      ranked = JSON.parse(cleaned);
      if (!Array.isArray(ranked)) ranked = [];
    } catch {
      ranked = [{ title: 'Parse error', reason: text.slice(0, 200) }];
    }
    res.json({ ranked });
  } catch (e) {
    res.status(500).json({ message: e.message || 'AI error' });
  }
}

async function chat(req, res) {
  try {
    const { message, workspaceId } = req.body;
    if (!message) return res.status(400).json({ message: 'message required' });
    if (!workspaceId || !mongoose.Types.ObjectId.isValid(String(workspaceId))) {
      return res.status(400).json({ message: 'valid workspaceId required' });
    }
    if (!(await isUserInWorkspace(req.userId, workspaceId))) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    const memberProjects = await Project.find({
      workspaceId,
      'members.user': req.userId,
    })
      .select('_id')
      .lean();
    const idList = memberProjects.map((p) => p._id);
    let tasks = [];
    if (idList.length) {
      const raw = await Task.find({ workspaceId, projectId: { $in: idList } })
        .sort({ status: 1, order: 1 })
        .populate({ path: 'projectId', select: 'name' })
        .populate({ path: 'assignedTo', select: 'name' })
        .populate({ path: 'assignees', select: 'name' })
        .lean();
      const idStrings = idList.map((id) => id.toString());
      const pids = new Set(idStrings);
      const roleMap = await projectRoleMapForUser(req.userId, idStrings);
      tasks = filterTasksForUser(
        req.userId,
        raw,
        (pid) => pids.has(pid),
        roleMap
      );
    }

    const taskLines = tasks.map(
      (t) =>
        `- ${t.title} | status: ${t.status} | project: ${t.projectId?.name || 'General'} | assignee: ${assigneeLine(t)}`
    );
    const systemPrompt = `You are WorkNest AI assistant. Current workspace tasks:
${taskLines.length ? taskLines.join('\n') : '(no tasks visible to this user)'}

Summarize tasks or projects when asked. List completed vs remaining tasks for project summaries. Be concise.`;

    const text = await complete(systemPrompt, String(message).slice(0, 100000), 1024);
    res.json({ reply: text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'AI error' });
  }
}

module.exports = { summarize, suggestTasks, planDay, prioritize, chat };
