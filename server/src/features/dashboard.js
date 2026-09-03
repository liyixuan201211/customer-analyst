// 数据大屏 v2：漏斗/成交趋势/分层/产品 丰富指标
import { customers, chatRecords, orders, products, followups, staff, tables } from '../db/index.js';
import { computeRFM } from '../tools/analysis.js';

export default function register(api) {
  api.get('/dashboard/v2', (c) => {
    const cs = customers.list();
    const stageCount = { 认知: 0, 兴趣: 0, 评估: 0, 谈判: 0, 成交: 0, 复购: 0 };
    for (const cu of cs) { const s = cu.profile?.decision?.stage; if (s && s in stageCount) stageCount[s]++; }
    const funnel = Object.entries(stageCount).map(([name, value]) => ({ name, value })).filter(x => x.value > 0);

    const os = orders.list({});
    const byMonth = {};
    for (const o of os) { const d = new Date(o.order_date || o.created_at); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; byMonth[k] = (byMonth[k] || 0) + +o.amount; }
    const revenueByMonth = Object.entries(byMonth).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([month, amount]) => ({ month, amount: +amount.toFixed(2) })).slice(-8);

    const seg = {}; for (const cu of cs) { const r = computeRFM(cu, []); seg[r.segment] = (seg[r.segment] || 0) + 1; }
    const segments = Object.entries(seg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const fu = followups.list({}); const doneFu = fu.filter(f => f.status === 'done').length;
    const ps = products.list();
    return c.json({
      customers: cs.length, profiled: cs.filter(x => x.profile).length,
      funnel, revenueByMonth, segments,
      orders_total: +os.reduce((s, o) => s + +o.amount, 0).toFixed(2), orders_count: os.length,
      followup_completion: fu.length ? Math.round((doneFu / fu.length) * 100) : 0,
      low_stock: ps.filter(p => p.min_stock > 0 && p.stock < p.min_stock).map(p => ({ name: p.name, stock: p.stock })),
      top_customers: cs.map(x => ({ name: x.name, amount: +orders.totalByCustomer(x.id).amount.toFixed(2) })).sort((a, b) => b.amount - a.amount).slice(0, 8),
      staff: staff.list(),
    });
  });
}
