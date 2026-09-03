// 竞品对标库：记录竞品价格与特性，与自身产品对比
import { competitorPricing, products } from '../db/index.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  api.get('/competitors', (c) => c.json(competitorPricing.list({ product_name: c.req.query('product_name'), competitor: c.req.query('competitor') })));
  api.post('/competitors', async (c) => { const b = await c.req.json(); if (!b.product_name || !b.competitor) return c.json({ error: '缺少参数' }, 400); const x = competitorPricing.create(b); activity.log(ctx.me(c), 'add', 'competitor', x.id, `竞品 ${b.competitor} / ${b.product_name}`); return c.json(x); });
  api.patch('/competitors/:id', async (c) => c.json(competitorPricing.update(c.req.param('id'), await c.req.json())));
  api.delete('/competitors/:id', (c) => { competitorPricing.remove(c.req.param('id')); return c.json({ ok: true }); });
  api.get('/competitors/compare', (c) => {
    const name = c.req.query('product_name') || '';
    const ours = products.list(name)[0] || products.list().find(p => p.name.includes(name));
    const items = competitorPricing.list({ product_name: name });
    const our = ours ? +ours.current_price : 0;
    return c.json({
      product: ours ? ours.name : name, ourPrice: our,
      items: items.map(i => ({ ...i, gapPercent: our > 0 && i.price != null ? Math.round((((our - i.price) / our)) * 100) : null, advantage: our > 0 && i.price != null ? (our <= i.price ? '价格占优' : '价格偏高') : '' })),
    });
  });
}
