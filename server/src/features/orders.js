// 成交订单（真实 RFM 金额来源）
import { customers, orders } from '../db/index.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  api.get('/orders', (c) => {
    const { customer_id, status, product_id, limit } = c.req.query();
    return c.json(orders.list({ customer_id, status, product_id, limit: +(limit || 300) }));
  });
  api.get('/orders/by-customer/:id', (c) => {
    const cu = customers.get(c.req.param('id'));
    if (!cu) return c.json({ error: 'not found' }, 404);
    const t = orders.totalByCustomer(cu.id);
    return c.json({ id: cu.id, name: cu.name, company: cu.company, ...t, orders: orders.list({ customer_id: cu.id }) });
  });
  api.get('/orders/stats', (c) => {
    const all = orders.list({ limit: 5000 });
    const byStatus = {}; let total = 0; let count = 0; const byCust = {};
    for (const o of all) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.status !== 'cancelled') { total += +o.amount || 0; count++; }
      const cid = o.customer_name || '未知';
      byCust[cid] = (byCust[cid] || 0) + (+o.amount || 0);
    }
    const topCustomers = Object.entries(byCust).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, amount]) => ({ name, amount: +amount.toFixed(2) }));
    return c.json({ total: +total.toFixed(2), count, byStatus, topCustomers });
  });
  api.post('/orders', async (c) => {
    const b = await c.req.json();
    if (!b.customer_id) return c.json({ error: '请选择客户' }, 400);
    const o = orders.create({ ...b, created_by: ctx.me(c)?.id });
    activity.log(ctx.me(c), 'add', 'order', o.id, `成交 ${o.product_name || ''} ${o.amount}`);
    return c.json(o);
  });
  api.patch('/orders/:id', async (c) => { const o = orders.update(c.req.param('id'), await c.req.json()); if (o) activity.log(ctx.me(c), 'update', 'order', o.id, '更新订单'); return c.json(o); });
  api.delete('/orders/:id', (c) => { orders.remove(c.req.param('id')); return c.json({ ok: true }); });
}
