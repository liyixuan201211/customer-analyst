// 多币种 + 汇率换算：配置汇率，报表按币种折算
import { getSetting, setSetting, orders, customers } from '../db/index.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/currency', (c) => c.json({ rates: getSetting('rates', { USD: 7.2, EUR: 7.8, JPY: 0.048, GBP: 9.2 }), base: 'CNY' }));
  api.post('/currency', async (c) => { const { rates } = await c.req.json(); setSetting('rates', rates || {}); activity.log(u(c), 'update', 'settings', null, '更新汇率'); return c.json({ rates: getSetting('rates', {}) }); });
  api.get('/currency/convert/:target', (c) => {
    const rates = getSetting('rates', { USD: 7.2, EUR: 7.8, JPY: 0.048, GBP: 9.2 });
    const t = c.req.params.target.toUpperCase(); const rate = rates[t] || 1;
    const os = orders.list({});
    const amount = +os.reduce((s, o) => s + +o.amount, 0).toFixed(2);
    return c.json({ target: t, rate, amount_cny: amount, converted: +(amount / rate).toFixed(2), orders: os.length });
  });
  api.get('/currency/summary', (c) => {
    const rates = getSetting('rates', { USD: 7.2, EUR: 7.8, JPY: 0.048, GBP: 9.2 });
    const os = orders.list({});
    const byCcy = {}; for (const o of os) { byCcy[o.currency || 'CNY'] = (byCcy[o.currency || 'CNY'] || 0) + +o.amount; }
    for (const k of Object.keys(byCcy)) byCcy[k] = +(byCcy[k] || 0).toFixed(2);
    const cny = +os.reduce((s, o) => s + +o.amount, 0).toFixed(2);
    return c.json({ base: 'CNY', total_cny: cny, byCurrency: byCcy, rates, converted: Object.fromEntries(Object.entries(rates).map(([ccy, r]) => [ccy, +(cny / r).toFixed(2)])) });
  });
}
