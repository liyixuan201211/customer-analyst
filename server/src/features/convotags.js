// 会话标签与摘要：为对话生成主题标签 + 一句话摘要
import { conversations, messages as msgs } from '../db/index.js';
import { chatJSON, DEFAULTS } from '../llm/aiping.js';

const summarize = async (convId) => {
  const conv = conversations.get(convId); if (!conv) return null;
  const ms = msgs.list(convId).filter(m => m.role === 'user' || m.role === 'assistant');
  const text = ms.slice(-12).map(m => (m.role === 'user' ? '客户: ' : '我: ') + (m.content || '').slice(0, 300)).join('\n').slice(0, 4000);
  if (!text.trim()) return null;
  const r = await chatJSON({ model: DEFAULTS.chat, temperature: 0.2, system: '你是销售助手。根据对话内容输出 JSON {"tags":["3-5个中文主题标签"],"summary":"一句话摘要"}', user: text });
  const tags = (r?.tags || []).slice(0, 5); const summary = r?.summary || '';
  conversations.update(convId, { topic: (r?.tags?.[0] || conv.topic || conv.title), summary });
  return { id: convId, title: conv.title, tags, summary };
};

export default function register(api) {
  api.get('/convos/with-tags', (c) => c.json(conversations.list().map(x => ({ id: x.id, title: x.title, topic: x.topic, summary: x.summary, updated_at: x.updated_at }))));
  api.post('/convos/:id/summarize', async (c) => { const r = await summarize(c.req.param('id')); return c.json(r || { error: '无内容' }); });
  api.post('/summarize-all', async (c) => {
    const convs = conversations.list(); const out = [];
    for (const x of convs.slice(0, 20)) { try { const r = await summarize(x.id); if (r) out.push(r); } catch {} }
    return c.json(out);
  });
}
