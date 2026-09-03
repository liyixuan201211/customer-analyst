// 智能跟进排程：综合时区/活跃时段/画像推荐最佳联系时间，一键转成已排期任务
import { customers, followups, chatRecords } from '../db/index.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  api.get('/schedule/recommend/:customerId', (c) => {
    const cu = customers.get(c.req.param('customerId')); if (!cu) return c.json({ error: '客户不存在' }, 404);
    const p = cu.profile || {}; const b = p.behavior || {};
    // 活跃时段映射
    const hourMap = { 上午: 10, 中午: 12, 下午: 15, 晚上: 20 };
    const hour = b.active_hours ? (hourMap[Object.keys(hourMap).find(k => (b.active_hours || '').includes(k))] ?? 10) : 9;
    const last = chatRecords.list(cu.id).map(r => r.created_at).sort((a, b) => b - a)[0];
    const silentDays = last ? Math.floor((Date.now() - last) / 864e5) : 0;
    const urgency = p.decision?.urgency;
    const tz = b.timezone || '未知时区';
    const daysAhead = urgency === '高' ? 0 : urgency === '中' ? 1 : 2;
    const due = new Date(); due.setDate(due.getDate() + daysAhead); due.setHours(hour, 30, 0, 0); if (due.getTime() < Date.now()) due.setDate(due.getDate() + 1);
    const channel = p.price_sensitivity?.level === '高' ? 'email' : 'call';
    return c.json({
      customer: cu.name, timezone_hint: tz, best_hour: hour, best_channel: channel, recommended_at: due.getTime(),
      reason: `活跃时段 ${b.active_hours || '未知'}，沉默 ${silentDays} 天，紧迫度 ${urgency || '低'}，建议${channel === 'email' ? '邮件' : '电话'}在 ${hour}:30 联系`,
      topics: p.decision?.stage ? [`围绕${p.decision.stage}阶段推进`] : [],
    });
  });
  api.post('/schedule/apply', async (c) => {
    const { customer_id, type, subject, note, due_at } = await c.req.json();
    if (!customer_id) return c.json({ error: '缺少客户' }, 400);
    const f = followups.create({ customer_id, type: type || 'call', subject: subject || '智能排程跟进', note: note || '', due_at: due_at || Date.now() + 24 * 3600 * 1000, assignee_name: ctx.me(c)?.display_name, created_by: ctx.me(c)?.id });
    activity.log(ctx.me(c), 'add', 'followup', f.id, '按智能排程创建跟进');
    return c.json(f);
  });
}
