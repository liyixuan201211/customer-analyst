// 触达时间线：合并聊天/跟进/订单/评论/定价/画像于一条时间轴
import { customers, chatRecords, followups, orders, tables } from '../db/index.js';
import { comments } from '../auth.js';

export default function register(api, ctx) {
  api.get('/timeline/:customerId', (c) => {
    const cu = customers.get(c.req.param('customerId'));
    if (!cu) return c.json({ error: 'not found' }, 404);
    const ev = [];
    for (const r of chatRecords.list(cu.id)) ev.push({ ts: r.created_at, type: 'chat', title: r.file_name || '聊天记录', detail: r.content.slice(0, 200), meta: `${r.parsed?.length || 0} 条消息` });
    for (const f of followups.list({ customer_id: cu.id })) ev.push({ ts: f.created_at, type: 'followup' + (f.status === 'done' ? '-done' : ''), title: `跟进·${f.subject || f.type}`, detail: f.note || '', meta: f.due_at ? new Date(f.due_at).toLocaleDateString('zh-CN') : '' });
    for (const o of orders.list({ customer_id: cu.id })) ev.push({ ts: o.order_date || o.created_at, type: 'order-' + o.status, title: `订单·${o.product_name || ''}`, detail: `${o.qty}×¥${o.unit_price}`, meta: `¥${o.amount}` });
    for (const cm of comments.list(cu.id)) ev.push({ ts: cm.created_at, type: 'comment', title: '协作笔记', detail: cm.text.slice(0, 120), meta: cm.user_name || '' });
    for (const tb of tables.list(cu.id)) ev.push({ ts: tb.created_at, type: 'table', title: `表格·${tb.title}`, detail: `${tb.rows.length} 行`, meta: '' });
    ev.sort((a, b) => b.ts - a.ts);
    return c.json({ customer: { id: cu.id, name: cu.name, company: cu.company }, events: ev });
  });
}
