// 每日简报：今日跟进/逾期/高危流失/库存/新成交 聚合摘要
import { followups, products, orders, tables, customers } from '../db/index.js';
import { chatJSON, DEFAULTS } from '../llm/aiping.js';
import { computeRFM } from '../tools/analysis.js';

export default function register(api) {
  api.get('/brief', async (c) => {
    const today = followups.list({ status: 'today' });
    const overdue = followups.list({ status: 'open' });
    const upcoming = followups.list({ status: 'upcoming' });
    const ps = products.list();
    const lowStock = ps.filter(p => p.min_stock > 0 && p.stock < p.min_stock);
    const ordersToday = orders.list({}).filter(o => o.order_date && new Date(o.order_date).toDateString() === new Date().toDateString());
    const newTables = tables.list().slice(0, 3);
    const cs = customers.list();
    const rfmList = cs.map(x => computeRFM(x, []));
    const churn = rfmList.filter(x => x.segment.includes('挽留')).sort((a, b) => b.recency_days - a.recency_days).slice(0, 5);

    const facts = {
      today_followups: today.map(f => ({ customer: f.customer_name, subject: f.subject || f.type })).slice(0, 6),
      overdue: overdue.slice(0, 5).map(f => ({ customer: f.customer_name, subject: f.subject || f.type, days: f.due_at ? Math.floor((Date.now() - f.due_at) / 864e5) : 0 })),
      low_stock: lowStock.slice(0, 6).map(p => ({ name: p.name, stock: p.stock, min: p.min_stock })),
      orders_today: ordersToday.length,
      order_amount_today: +ordersToday.reduce((s, o) => s + +o.amount, 0).toFixed(2),
      at_risk: churn.map(x => ({ name: x.name, recency_days: x.recency_days, segment: x.segment })),
    };
    let narrative = '';
    try { const r = await chatJSON({ model: DEFAULTS.chat, temperature: 0.4, system: '你是销售主管。根据今日业务简报数据，写 2-3 句简短的中文晨会摘要，给出最优先的 2 件事。只输出 JSON {"narrative":"...","top_priorities":["...","..."]}', user: JSON.stringify(facts) }); narrative = r; } catch {}
    return c.json({ facts, narrative: narrative?.narrative || '', top_priorities: narrative?.top_priorities || [] });
  });
}
