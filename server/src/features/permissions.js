// 权限与数据隔离：客户可见性（team/private）+ 角色说明
import { customers } from '../db/index.js';
import { users } from '../auth.js';

export default function register(api, ctx) {
  const enrich = (cu) => cu && ({ ...cu, owner: cu.owner_id ? (users.byId(cu.owner_id)?.display_name || users.byId(cu.owner_id)?.username) : null });
  // 可见的所有客户（成员）：团队共享 + 自己拥有的私有
  api.get('/customers/visible', (c) => {
    const u = ctx.me(c);
    const all = customers.list();
    const vis = all.filter(x => x.visibility === 'team' || x.owner_id === u.id || u.role === 'admin' || !x.owner_id);
    return c.json(vis.map(enrich));
  });
  // 只看我的客户
  api.get('/customers/mine', (c) => {
    const u = ctx.me(c); if (u.role === 'admin') return c.json(customers.list().map(enrich));
    return c.json(customers.list().filter(x => x.owner_id === u.id).map(enrich));
  });
  // 设置某客户可见性
  api.patch('/customers/:id/visibility', async (c) => {
    const { visibility } = await c.req.json();
    if (!['team', 'private'].includes(visibility)) return c.json({ error: '状态无效' }, 400);
    const cu = customers.get(c.req.param('id')); if (!cu) return c.json({ error: 'not found' }, 404);
    return c.json(enrich(customers.update(cu.id, { visibility })));
  });
  api.get('/permissions', (c) => {
    const u = ctx.me(c);
    return c.json({
      role: u.role, username: u.username, display_name: u.display_name,
      rules: {
        admin: '可看全部数据、管理成员、审批', member: '可看团队共享客户 + 自己的私有客户',
      },
      access: [
        { label: '团队共享客户', allowed: true, desc: '所有成员可见（visibility=team）' },
        { label: '私有客户', allowed: u.role === 'admin', desc: u.role === 'admin' ? '管理员可见所有私有客户' : '仅 owner 本人可见（visibility=private）' },
        { label: '成员管理/审批', allowed: u.role === 'admin', desc: '仅管理员' },
      ],
    });
  });
}
