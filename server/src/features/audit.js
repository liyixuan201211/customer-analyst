// 审计与合规导出：活动日志筛选 + 全量数据快照 CSV
import { activity, users } from '../auth.js';
import { db } from '../db/index.js';

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

export default function register(api) {
  api.get('/audit', (c) => {
    let list = activity.list(+(c.req.query('limit') || 500));
    const u = c.req.query('user'), ent = c.req.query('entity'), act = c.req.query('action');
    if (u) list = list.filter(a => (a.actor_name || '').includes(u) || a.actor_id === u);
    if (ent) list = list.filter(a => a.entity === ent);
    if (act) list = list.filter(a => a.action === act);
    return c.json(list);
  });
  api.get('/audit/export.csv', (c) => {
    const act = activity.list(5000);
    const lines = ['操作人,动作,对象,对象ID,详情,时间'];
    for (const a of act) lines.push([esc(a.actor_name), esc(a.action), esc(a.entity), esc(a.entity_id), esc(a.detail), esc(new Date(a.created_at).toISOString())].join(','));
    // 追加数据快照
    const cs = db.prepare('SELECT id,name,company,phone,owner_id FROM customers').all();
    lines.push('');
    lines.push('--- 客户数据快照 ---');
    lines.push('客户ID,客户名称,公司,电话,负责ID');
    for (const r of cs) lines.push([esc(r.id), esc(r.name), esc(r.company), esc(r.phone), esc(r.owner_id)].join(','));
    return new Response('\uFEFF' + lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('审计导出.csv')}` } });
  });
}
