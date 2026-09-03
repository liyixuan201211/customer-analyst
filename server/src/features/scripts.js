// 话术库/模板中心
import { scripts } from '../db/index.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  api.get('/scripts', (c) => c.json(scripts.list({ category: c.req.query('category'), scene: c.req.query('scene'), q: c.req.query('q') })));
  api.get('/scripts/categories', (c) => c.json(scripts.categories()));
  api.post('/scripts', async (c) => { const b = await c.req.json(); if (!b.title || !b.content) return c.json({ error: '缺少标题或内容' }, 400); const s = scripts.create(b); activity.log(ctx.me(c), 'add', 'script', s.id, `话术 ${b.title}`); return c.json(s); });
  api.delete('/scripts/:id', (c) => { scripts.remove(c.req.param('id')); return c.json({ ok: true }); });
}
