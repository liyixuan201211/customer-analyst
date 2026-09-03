// 多智能体分工：画像 → 忠诚度 → 定价 → 策略 编排合成
import { customers, chatRecords, products } from '../db/index.js';
import { buildProfile, analyzeLoyalty, computeRFM, buildTableAndAdvice } from '../tools/analysis.js';
import { computePrice, pricingForCustomer } from '../tools/pricing.js';
import { activity } from '../auth.js';

const STAGES = ['profile', 'loyalty', 'rfm', 'pricing', 'strategy'];

export default function register(api, ctx) {
  api.get('/multiagent/stages', (c) => c.json(STAGES));
  api.post('/multiagent/task', async (c) => {
    const { customer_id, product_id } = await c.req.json();
    const cu = customers.get(customer_id); if (!cu) return c.json({ error: '客户不存在' }, 400);
    const u = ctx.me(c);
    const stages = [];
    const push = (name, status, data) => stages.push({ name, status, data, at: Date.now() });

    try { push('profile', 'running'); const p = await buildProfile(customer_id); push('profile', 'done', { summary: p.summary, disc: p.personality?.type }); }
    catch (e) { push('profile', 'error', e.message); }

    try { push('loyalty', 'running'); const l = await analyzeLoyalty(customer_id); push('loyalty', 'done', { score: l.score, level: l.level }); }
    catch (e) { push('loyalty', 'error', e.message); }

    try { push('rfm', 'running'); const r = computeRFM(cu, chatRecords.list(customer_id)); push('rfm', 'done', { segment: r.segment, r: r.r, f: r.f, m: r.m }); }
    catch (e) { push('rfm', 'error', e.message); }

    if (product_id) { try { push('pricing', 'running'); const p = products.get(product_id); const r = computePrice(p, pricingForCustomer(p, cu)); push('pricing', 'done', { suggested: r.suggested_price, distribution: r.distribution }); } catch (e) { push('pricing', 'error', e.message); } }

    try { push('strategy', 'running'); const t = await buildTableAndAdvice(customer_id); push('strategy', 'done', { table: t.table?.title, rows: t.table?.rows?.length }); }
    catch (e) { push('strategy', 'error', e.message); }

    activity.log(u, 'analyze', 'customer', customer_id, '多智能体综合分析');
    const failed = stages.filter(s => s.status === 'error').length;
    return c.json({ customer: cu.name, stages, done: stages.filter(s => s.status === 'done').length, failed });
  });
}
