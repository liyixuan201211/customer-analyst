// 审批流：调价/优惠/新增审批
import { approvals, products } from '../db/index.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  api.get('/approvals', (c) => c.json(approvals.list({ status: c.req.query('status'), entity_type: c.req.query('entity_type') })));
  api.post('/approvals', async (c) => {
    const b = await c.req.json();
    if (!b.entity_type) return c.json({ error: '缺少类型' }, 400);
    const u = ctx.me(c);
    const a = approvals.create({ ...b, requested_by: u?.id, requested_by_name: u?.display_name || u?.username });
    activity.log(u, 'add', 'approval', a.id, `申请审批·${a.subject || a.entity_type}`);
    return c.json(a);
  });
  api.post('/approvals/:id/review', async (c) => {
    const { status } = await c.req.json();
    if (!['approved', 'rejected'].includes(status)) return c.json({ error: '状态无效' }, 400);
    const u = ctx.me(c);
    if (u?.role !== 'admin') return c.json({ error: '需要管理员权限' }, 403);
    const a = approvals.review(c.req.param('id'), status, u?.id, u?.display_name || u?.username);
    activity.log(u, 'update', 'approval', c.req.param('id'), `审批${status === 'approved' ? '通过' : '拒绝'}`);
    return c.json(a);
  });
  // 便捷：为调价生成审批（结合动态定价）
  api.post('/approvals/from-pricing', async (c) => {
    const { product_id, new_price, reason } = await c.req.json();
    const p = products.get(product_id); if (!p) return c.json({ error: '商品不存在' }, 404);
    const u = ctx.me(c);
    const a = approvals.create({ entity_type: 'pricing', entity_id: p.id, subject: `调价·${p.name}`, amount: +new_price, reason: reason || `现价 ¥${p.current_price} → ¥${new_price}`, requested_by: u?.id, requested_by_name: u?.display_name || u?.username });
    return c.json(a);
  });
}
