// 报表中心 + 定时周报/月报：AI 生成管理层报告，可导出
import { customers, orders, products, followups, tables } from '../db/index.js';
import { chatJSON, DEFAULTS } from '../llm/aiping.js';
import { getSetting, setSetting } from '../db/index.js';

const REPORTS = [
  { id: 'weekly', label: '周报' }, { id: 'monthly', label: '月报' },
];

function gather() {
  const cs = customers.list(); const os = orders.list({}); const ps = products.list(); const fu = followups.list({});
  return {
    customers: cs.length, new_profiled: cs.filter(x => x.profile).length,
    orders_count: os.length, orders_amount: +os.reduce((s, o) => s + +o.amount, 0).toFixed(2),
    high_churn: cs.filter(x => x.loyalty?.churn_risk?.level === '高').length,
    low_stock: ps.filter(p => p.min_stock > 0 && p.stock < p.min_stock).length,
    followups: fu.length, followups_done: fu.filter(f => f.status === 'done').length,
    top_customers: cs.map(x => ({ name: x.name, amount: +orders.totalByCustomer(x.id).amount.toFixed(2) })).sort((a, b) => b.amount - a.amount).slice(0, 5),
  };
}
const fmt = (d) => {
  const rows = [
    ['客户总数', d.customers], ['新增画像', d.new_profiled], ['订单数', d.orders_count], ['成交额', '¥' + d.orders_amount],
    ['高危流失', d.high_churn], ['低库存', d.low_stock], ['跟进/完成', `${d.followups}/${d.followups_done}`],
    ['重点客户', d.top_customers.map(x => `${x.name}(${x.amount})`).join('、')],
  ];
  return rows.map(([k, v]) => `${k}: ${v}`).join('\n');
};

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/reports', (c) => c.json({ kinds: REPORTS, schedule: getSetting('report_schedule', { enabled: false, kind: 'weekly', email: '' }), recent: getSetting('recent_reports', []) }));
  api.post('/reports/generate', async (c) => {
    const { kind, email } = await c.req.json();
    const d = gather(); const dataText = fmt(d);
    let narrative = ''; let insights = [];
    try { const r = await chatJSON({ model: DEFAULTS.chat, temperature: 0.4, system: '你是销售总监。根据业务数据写一份关于本周/本月运营的中文报告摘要，输出 JSON {"narrative":"120字内的运营总结","insights":["3-5条洞察"]}', user: dataText }); narrative = r?.narrative || ''; insights = r?.insights || []; } catch {}
    const report = { id: Date.now(), kind: kind || 'weekly', email, generated_at: Date.now(), data: d, narrative, insights, text: dataText };
    const recent = [{ ...report, data: undefined }, ...(getSetting('recent_reports', []) || [])].slice(0, 20);
    setSetting('recent_reports', recent);
    activity.log(u(c), 'generate', 'report', String(report.id), `生成${kind === 'monthly' ? '月报' : '周报'}`);
    return c.json(report);
  });
  api.post('/reports/schedule', async (c) => { const b = await c.req.json(); setSetting('report_schedule', b); return c.json({ ok: true, schedule: b }); });
  api.get('/reports/export', (c) => {
    const recent = getSetting('recent_reports', []) || [];
    const rec = recent[0]; if (!rec) return c.text('暂无报告', 404);
    const d = rec.data || gather();
    const lines = ['字段,值', ...Object.entries({ 客户总数: d.customers, 订单数: d.orders_count, 成交额: d.orders_amount, 低库存: d.low_stock, 高危流失: d.high_churn }).map(([k, v]) => `"${k}",${v}`)];
    return new Response('\uFEFF' + lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('运营报告.csv')}` } });
  });
}
