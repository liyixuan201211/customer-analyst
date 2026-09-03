// 开放 API / Webhook 集成
import { webhooks } from '../db/index.js';
import { activity } from '../auth.js';

const samplePayload = { event: 'customer.created', data: { id: 'cust-1', name: '示例客户' }, created_at: Date.now() };

async function fireWebhook(w, payload) {
  try { await fetch(w.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(w.secret ? { 'x-webhook-secret': w.secret } : {}) }, body: JSON.stringify(payload) }); return true; } catch { return false; }
}

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/webhooks', (c) => c.json(webhooks.list()));
  api.post('/webhooks', async (c) => { const b = await c.req.json(); if (!b.url) return c.json({ error: '缺少 url' }, 400); const w = webhooks.create(b); activity.log(u(c), 'add', 'webhook', w.id, `Webhook ${b.name || b.url}`); return c.json(w); });
  api.patch('/webhooks/:id', async (c) => c.json(webhooks.update(c.req.param('id'), await c.req.json())));
  api.delete('/webhooks/:id', (c) => { webhooks.remove(c.req.param('id')); return c.json({ ok: true }); });
  api.post('/webhooks/:id/test', async (c) => { const w = webhooks.list().find(x => x.id === c.req.param('id')); if (!w) return c.json({ error: 'not found' }, 404); const ok = await fireWebhook({ ...w, url: w.url }, samplePayload); return c.json({ ok, delivered: ok }); });
  api.get('/api-info', (c) => c.json({ base: process.env.AIPING_BASE_URL || '/api', version: 'v1', endpoints: [
    'GET/POST/PATCH/DELETE /api/customers', 'GET/POST/PATCH/DELETE /api/orders', 'GET/POST /api/followups', 'GET/POST /api/products',
    'GET /api/kb/search', 'GET /api/search', 'POST /api/customers/:id/profile', 'POST /api/customers/:id/loyalty',
    'POST /api/customers/:id/followup-message', 'POST /api/import/batch', 'GET /api/churn', 'GET /api/anomaly',
  ], auth: 'Bearer <session-token>' }));
}
