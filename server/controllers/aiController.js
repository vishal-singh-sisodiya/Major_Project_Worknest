const Anthropic = require('@anthropic-ai/sdk');

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function complete(system, userMessage) {
  const client = getClient();
  const msg = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });
  const block = (msg.content || []).find((b) => b.type === 'text');
  return block && block.text ? block.text : '';
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
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ message: 'message required' });
    const ctx = context ? `Context:\n${context}\n\n` : '';
    const text = await complete('You are a concise assistant.', ctx + message);
    res.json({ reply: text });
  } catch (e) {
    res.status(500).json({ message: e.message || 'AI error' });
  }
}

module.exports = { summarize, suggestTasks, planDay, prioritize, chat };
