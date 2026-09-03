// 字段级/操作级权限：敏感字段（成本/价格/毛利）按角色显示控制 + 导出权限
import { customers, products } from '../db/index.js';

// 敏感字段白名单：非管理员返回时屏蔽
const SENSITIVE = ['cost', 'margin', 'current_price', 'base_price'];
export const maskProduct = (p, user) => {
  if (!p) return p;
  if (user?.role === 'admin') return p;
  const out = { ...p };
  for (const f of SENSITIVE) if (f in out) out[f] = null;
  return out;
};

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/permissions/fields', (c) => c.json({
    role: u(c).role,
    sensitive_fields: SENSITIVE,
    rules: { admin: '可见全部字段', member: '隐藏成本/毛利，价格可见' },
    export_allowed: u(c).role === 'admin',
  }));
  api.get('/permissions/can-export', (c) => c.json({ export_allowed: u(c).role === 'admin', reason: u(c).role === 'admin' ? '管理员' : '成员限制，请联系管理员' }));
  // 供前端取"已脱敏"的客户/商品视图
  api.get('/products/safe', (c) => c.json(products.list().map(p => maskProduct(p, u(c)))));
  api.post('/customers/:id/share', async (c) => {
    const { customer_id } = c.req.params; const { visibility } = await c.req.json();
    const cu = customers.get(customer_id); if (!cu) return c.json({ error: 'not found' }, 404);
    return c.json(customers.update(cu.id, { visibility: visibility === 'private' ? 'private' : 'team' }));
  });
}
