// 销售管道看板：按决策阶段分列，支持拖拽移动
import { customers } from '../db/index.js';
import { activity } from '../auth.js';

const STAGES = ['认知', '兴趣', '评估', '谈判', '成交', '复购'];
const PROB = { 认知: 0.1, 兴趣: 0.2, 评估: 0.4, 谈判: 0.65, 成交: 0.95, 复购: 1 };

function expectedValue(cu) { const b = { 高: 50000, 中: 20000, 低: 8000 }[cu.profile?.basic?.budget_level] ?? 12000; return b; }

export default function register(api, ctx) {
  api.get('/pipeline', (c) => {
    const cs = customers.list();
    const cols = STAGES.map(st => ({ stage: st, value: PROB[st], customers: cs.filter(x => (x.profile?.decision?.stage || '认知') === st).map(x => ({ id: x.id, name: x.name, company: x.company, value: expectedValue(x), loyalty: x.loyalty?.score, rfm: (x.tags || []).find(t => /价值|保持|挽留|发展/.test(t)), tags: x.tags })) }));
    const total = cs.length; const won = (cols.find(c2 => c2.stage === '成交')?.customers.length || 0) + (cols.find(c2 => c2.stage === '复购')?.customers.length || 0);
    const pipeline = Math.round(cols.reduce((s, c2) => s + c2.customers.reduce((a, x) => a + x.value * c2.value, 0), 0));
    return c.json({ stages: STAGES, cols, summary: { total, won, pipeline, byStage: STAGES.map((s, i) => ({ stage: s, count: cols[i].customers.length, value: cols[i].customers.reduce((a, x) => a + x.value, 0) })) } });
  });
  api.post('/pipeline/move', async (c) => {
    const { customer_id, stage } = await c.req.json();
    if (!STAGES.includes(stage)) return c.json({ error: '阶段无效' }, 400);
    const cu = customers.get(customer_id); if (!cu) return c.json({ error: '客户不存在' }, 404);
    const profile = { ...(cu.profile || {}), decision: { ...(cu.profile?.decision || {}), stage } };
    const updated = customers.update(cu.id, { profile });
    activity.log(ctx.me(c), 'update', 'customer', cu.id, `管道阶段 → ${stage}`);
    return c.json({ ok: true, stage, customer: updated.name });
  });
}
