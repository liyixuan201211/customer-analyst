// 对话式 BI：自然语言问数据 → 意图路由 → 结构化结果（可选 LLM 叙述）
import { customers, orders, products, followups, chatRecords } from '../db/index.js';
import { computeRFM } from '../tools/analysis.js';
import { chatJSON, DEFAULTS } from '../llm/aiping.js';

function gather(intent, ctx) {
  switch (intent) {
    case 'orders': { const o = orders.list({}); const total = o.reduce((s, x) => s + +x.amount, 0); return { intent, label: '成交统计', data: { total: +total.toFixed(2), count: o.length, monthly: last6mo(o) } }; }
    case 'top_customers': { const cs = customers.list(); const arr = cs.map(x => ({ name: x.name, amount: +orders.totalByCustomer(x.id).amount.toFixed(2) })).sort((a, b) => b.amount - a.amount).slice(0, 8); return { intent, label: '重点客户', data: arr }; }
    case 'churn': { const cs = customers.list(); const arr = cs.map(x => { const r = computeRFM(x, chatRecords.list(x.id)); return { name: x.name, score: r.recency_days > 30 ? 50 : 10, silent: r.recency_days }; }).sort((a, b) => b.silent - a.silent).slice(0, 8); return { intent, label: '流失风险', data: arr }; }
    case 'price_sensitive': { const cs = customers.list().filter(x => x.profile?.price_sensitivity?.level === '高'); return { intent, label: '价格敏感客户', data: cs.map(x => ({ name: x.name, company: x.company })) }; }
    case 'today_followup': { const t = followups.list({ status: 'today' }); return { intent, label: '今日跟进', data: t.map(x => ({ name: x.customer_name, subject: x.subject || x.type })) }; }
    case 'low_stock': { const ps = products.list().filter(p => p.min_stock > 0 && p.stock < p.min_stock); return { intent, label: '低库存', data: ps.map(p => ({ name: p.name, stock: p.stock, min: p.min_stock })) }; }
    default: return { intent: 'unknown', label: '未识别', data: [] };
  }
}
function last6mo(o) { const m = {}; for (const x of o) { const d = new Date(x.order_date || x.created_at); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; m[k] = (m[k] || 0) + +x.amount; } return Object.entries(m).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-6).map(([month, amount]) => ({ month, amount: +amount.toFixed(2) })); }
function route(q) {
  if (/成交|订单|销售额|金额|sales|order|revenue/.test(q)) return 'orders';
  if (/重点|top|最大|大客户|客户.*(成交|贡献)/.test(q)) return 'top_customers';
  if (/流失|风险|churn/.test(q)) return 'churn';
  if (/价格敏感|在意价格|比价/.test(q)) return 'price_sensitive';
  if (/今日跟进|待办|跟进任务|follow/.test(q)) return 'today_followup';
  if (/库存|补货|缺货|stock/.test(q)) return 'low_stock';
  return 'unknown';
}
export default function register(api) {
  api.post('/bi/query', async (c) => {
    const { question } = await c.req.json();
    if (!question) return c.json({ error: '缺少问题' }, 400);
    const intent = route(question);
    const result = gather(intent);
    let narrative = '';
    if (intent !== 'unknown') { try { const r = await chatJSON({ model: DEFAULTS.chat, temperature: 0.3, system: '你是数据分析师，根据查询结果用一句中文简短回答。只输出 {"answer":"..."}', user: `问题：${question}\n结果：${JSON.stringify(result.data).slice(0, 1500)}` }); narrative = r?.answer || ''; } catch {} }
    return c.json({ ...result, question, narrative, chart: result.intent === 'orders' ? 'line' : result.intent === 'top_customers' || result.intent === 'churn' ? 'bar' : 'list' });
  });
}
