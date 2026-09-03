// 邮件/WhatsApp 定时发送 + 回执跟踪（状态漏斗）
import { followups, customers } from '../db/index.js';
import { activity } from '../auth.js';

const SEND_STATUS = ['scheduled', 'sent', 'opened', 'replied', 'failed'];

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/send', (c) => {
    const all = followups.list({}).filter(f => f.type === 'email' || f.type === 'whatsapp');
    const byStatus = {}; for (const s of SEND_STATUS) byStatus[s] = all.filter(f => (f.send_status || 'scheduled') === s).length;
    return c.json({ list: all.slice(0, 200), byStatus });
  });
  // 通过联系人+正文，创建一条待发送消息（type email/whatsapp）
  api.post('/send', async (c) => {
    const { customer_id, type, body, send_at, recipient } = await c.req.json();
    const cu = customers.get(customer_id); if (!cu) return c.json({ error: '客户不存在' }, 400);
    const f = followups.create({ customer_id, type: type === 'whatsapp' ? 'whatsapp' : 'email', subject: `发送·${cu.name}`, note: body, due_at: send_at || Date.now() + 3600 * 1000, recipient: recipient || '', message_content: body, send_status: 'scheduled', created_by: u(c)?.id });
    activity.log(u(c), 'add', 'send', f.id, `定时${type} 给 ${cu.name}`);
    return c.json(f);
  });
  api.post('/send/:id/status', async (c) => { const { status } = await c.req.json(); if (!SEND_STATUS.includes(status)) return c.json({ error: '状态无效' }, 400); const f = followups.update(c.req.param('id'), { send_status: status }); return c.json(f); });
  api.post('/send/:id/mark', async (c) => { const { status } = await c.req.json(); const f = followups.update(c.req.param('id'), { send_status: status || 'sent' }); return c.json(f); });
  api.delete('/send/:id', (c) => { followups.remove(c.req.param('id')); return c.json({ ok: true }); });
}
