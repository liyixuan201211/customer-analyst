// 客户问卷（NPS/满意度）
import { surveys } from '../db/index.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  api.get('/surveys', (c) => c.json(surveys.list({ customer_id: c.req.query('customer_id'), status: c.req.query('status') })));
  api.post('/surveys', async (c) => { const b = await c.req.json(); if (!b.title) return c.json({ error: '缺少标题' }, 400); const s = surveys.create(b); activity.log(ctx.me(c), 'add', 'survey', s.id, `问卷 ${b.title}`); return c.json(s); });
  api.patch('/surveys/:id', async (c) => { const b = await c.req.json(); const s = surveys.update(c.req.param('id'), b); if (b.score != null) activity.log(ctx.me(c), 'update', 'survey', c.req.param('id'), `问卷得分 ${b.score}`); return c.json(s); });
  api.delete('/surveys/:id', (c) => { surveys.remove(c.req.param('id')); return c.json({ ok: true }); });
}
