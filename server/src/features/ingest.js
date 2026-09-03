// 消息直连（ingress）：接收外部 IM 回调，自动同步客户消息进系统
import { customers, chatRecords } from '../db/index.js';
import { parseChatText, toTranscript, guessCustomerName } from '../tools/importer.js';
import { getSetting, setSetting } from '../db/index.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/ingest/config', (c) => c.json({ token: getSetting('ingest_token', ''), url: '/api/ingest/message' }));
  api.post('/ingest/config', async (c) => { const { token } = await c.req.json(); setSetting('ingest_token', token || ''); return c.json({ token }); });
  // 入站消息（外部回调）：{ token, customer_name?, company?, messages:[{speaker,text,time}], secret? }
  api.post('/ingest/message', async (c) => {
    const b = await c.req.json();
    const conf = getSetting('ingest_token', '');
    if (conf && b.token !== conf) return c.json({ error: 'token 无效' }, 403);
    const msgs = Array.isArray(b.messages) ? b.messages : [];
    const parsed = msgs.map(m => ({ time: m.time || '', speaker: m.speaker || '', text: m.text || '' })).filter(m => m.text);
    if (!parsed.length) return c.json({ error: '无消息' }, 400);
    let cu = b.customer_id ? customers.get(b.customer_id) : (b.customer_name && customers.findByName(b.customer_name));
    if (!cu) { const g = b.customer_name || await guessCustomerName(toTranscript(parsed)); cu = customers.findByName(g) || customers.create({ name: g, company: b.company, owner_id: u(c)?.id }); }
    const id = chatRecords.add({ customer_id: cu.id, source: 'ingest', file_name: b.source || '外部消息', content: toTranscript(parsed), parsed, owner_id: u(c)?.id });
    activity.log(u(c), 'import', 'customer', cu.id, `外部消息同步 ${parsed.length} 条`);
    return c.json({ ok: true, customer_id: cu.id, customer_name: cu.name, record_id: id, count: parsed.length });
  });
}
