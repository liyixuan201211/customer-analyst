// 客户终身价值 LTV 预测：基于平均客单/复购频率/忠诚度/生命周期
import { customers, chatRecords, orders } from '../db/index.js';

export default function register(api) {
  const compute = (cu) => {
    const o = orders.totalByCustomer(cu.id);
    const recs = chatRecords.list(cu.id);
    const last = recs.map(r => r.created_at).sort((a, b) => b - a)[0];
    const recency = last ? Math.floor((Date.now() - last) / 864e5) : 365;
    const freq = Math.max(1, recs.length || 1);              // 互动频次
    const avgOrder = o.count ? o.amount / o.count : 0;
    const loyalty = cu.loyalty?.score ?? 50;
    // 简单预测：年均购买次数 × 平均客单 × 忠诚系数 × 期望周期(3年)
    const annualOrders = Math.max(0.5, (o.count / Math.max(0.5, (Date.now() - (o.count ? 0 : Date.now())) / 31536000000 + 0.5)));
    const loyaltyFactor = 0.5 + (loyalty / 100);
    const recencyFactor = recency > 180 ? 0.4 : recency > 60 ? 0.7 : 1;
    const ltv = Math.round((avgOrder || (cu.profile?.basic?.budget_level === '高' ? 50000 : 20000)) * annualOrders * loyaltyFactor * recencyFactor * 3);
    return { id: cu.id, name: cu.name, company: cu.company, avg_order: Math.round(avgOrder), annual_orders: Math.round(annualOrders), loyalty, recency_days: recency, ltv, tier: ltv > 100000 ? '高价值' : ltv > 40000 ? '中价值' : '一般' };
  };
  api.get('/ltv', (c) => {
    const list = customers.list().map(compute).sort((a, b) => b.ltv - a.ltv);
    return c.json({ list, summary: { total: list.length, avg: list.length ? Math.round(list.reduce((a, b) => a + b.ltv, 0) / list.length) : 0, high: list.filter(x => x.tier === '高价值').length, total_ltv: list.reduce((a, b) => a + b.ltv, 0) } });
  });
  api.get('/ltv/:id', (c) => { const cu = customers.get(c.req.param('id')); return c.json(cu ? compute(cu) : { error: 'not found' }); });
}
