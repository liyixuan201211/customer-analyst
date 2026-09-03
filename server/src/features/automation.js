// 触发式自动化：规则引擎（沉默/投诉/新成交/低库存/无跟进 → 建跟进/发问卷/预警/打标）
import { customers, chatRecords, orders, products, followups, surveys, automationRules } from '../db/index.js';
import { activity } from '../auth.js';

const COMPLAINT = ['投诉', '退款', '退货', '太贵', '别家', '竞品', '失望', '不满', '不行', '换', '取消', '解约'];

function evalRule(rule, ctxUser) {
  const results = [];
  const runAction = async (customer, extra = {}) => {
    const cfg = rule.action_config || {};
    if (rule.action === 'create_followup') {
      followups.create({ customer_id: customer.id, type: cfg.type || 'call', subject: cfg.subject || `${rule.name}自动跟进`, note: cfg.note || `由「${rule.name}」触发`, due_at: Date.now() + 24 * 3600 * 1000, assignee_name: ctxUser?.display_name, created_by: ctxUser?.id });
      return { action: 'create_followup', target: customer.name };
    }
    if (rule.action === 'send_survey') {
      surveys.create({ customer_id: customer.id, title: cfg.subject || '满意度回访', questions: { 满意度: '1-10', 是否复购: '是/否' } });
      return { action: 'send_survey', target: customer.name };
    }
    if (rule.action === 'tag') { customers.update(customer.id, { tags: [...new Set([...(customer.tags || []), cfg.tag || rule.name])] }); return { action: 'tag', target: customer.name }; }
    return { action: rule.action, target: customer.name };
  };

  const trigger = rule.trigger;
  if (trigger === 'silent_days') {
    const days = rule.condition?.days ?? 30;
    for (const cu of customers.list()) { const last = chatRecords.list(cu.id).map(r => r.created_at).sort((a, b) => b - a)[0]; const silent = last ? Math.floor((Date.now() - last) / 864e5) : 999; if (silent >= days) results.push({ customer: cu, reason: `沉默 ${silent} 天`, extra: {} }); }
  } else if (trigger === 'complaint') {
    for (const cu of customers.list()) { const text = chatRecords.list(cu.id).map(r => r.content).join(' '); if (COMPLAINT.some(w => text.includes(w))) results.push({ customer: cu, reason: '检测到投诉/不满', extra: {} }); }
  } else if (trigger === 'new_order') {
    const hours = rule.condition?.hours ?? 24; const cutoff = Date.now() - hours * 3600 * 1000;
    for (const o of orders.list({})) { if ((o.order_date || o.created_at) >= cutoff && o.status !== 'cancelled') { const cu = customers.get(o.customer_id); if (cu) results.push({ customer: cu, reason: `新成交 ${o.product_name || ''} ¥${o.amount}`, extra: { } }); } }
  } else if (trigger === 'low_stock') {
    for (const p of products.list()) { if (p.min_stock > 0 && p.stock < p.min_stock) { const cu = customers.findByName(''); results.push({ customer: null, product: p, reason: `库存不足 ${p.name}（${p.stock}/${p.min_stock}）` }); } }
  } else if (trigger === 'no_followup') {
    const pending = new Set(followups.list({ status: 'pending' }).map(f => f.customer_id));
    for (const cu of customers.list()) if (cu.id && !pending.has(cu.id)) results.push({ customer: cu, reason: '无进行中跟进', extra: {} });
  }
  return results;
}

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/automation/rules', (c) => c.json(automationRules.list()));
  api.post('/automation/rules', async (c) => { const b = await c.req.json(); const r = automationRules.create(b); activity.log(u(c), 'add', 'rule', r.id, `自动化规则 ${b.name}`); return c.json(r); });
  api.patch('/automation/rules/:id', async (c) => c.json(automationRules.update(c.req.param('id'), await c.req.json())));
  api.delete('/automation/rules/:id', (c) => { automationRules.remove(c.req.param('id')); return c.json({ ok: true }); });
  api.post('/automation/run', async (c) => {
    const rules = automationRules.list({ active: 1 }); const log = [];
    for (const rule of rules) {
      const hits = await evalRule(rule, u(c));
      let applied = 0;
      for (const hit of hits) {
        try { const t = hit.customer ? await (runActionFor(hit.customer, rule, u(c))) : null; applied++; log.push({ rule: rule.name, reason: hit.reason, target: hit.customer?.name || hit.product?.name || '—', action: t?.action || rule.action }); } catch (e) { log.push({ rule: rule.name, reason: hit.reason, error: e.message }); }
      }
      automationRules.bump(rule.id);
      if (applied) activity.log(u(c), 'update', 'rule', rule.id, `触发器「${rule.name}」执行 ${applied} 次`);
    }
    return c.json({ run_at: Date.now(), triggered: log.length, log: log.slice(0, 100) });
  });
}
// 独立执行单个 rule 的 action
import { customers as _c } from '../db/index.js';
function runActionFor(customer, rule, user) {
  const cfg = rule.action_config || {};
  if (rule.action === 'create_followup') { followups.create({ customer_id: customer.id, type: cfg.type || 'call', subject: cfg.subject || `${rule.name}自动跟进`, note: cfg.note || '', due_at: Date.now() + 24 * 3600 * 1000, assignee_name: user?.display_name, created_by: user?.id }); return { action: 'create_followup' }; }
  if (rule.action === 'send_survey') { surveys.create({ customer_id: customer.id, title: cfg.subject || '满意度回访', questions: { 满意度: '1-10' } }); return { action: 'send_survey' }; }
  if (rule.action === 'tag') { customers.update(customer.id, { tags: [...new Set([...(customer.tags || []), cfg.tag || rule.name])] }); return { action: 'tag' }; }
  return { action: rule.action };
}
