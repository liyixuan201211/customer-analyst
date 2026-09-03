// 全库备份/恢复：导出全量 JSON，可下载/恢复
import { db } from '../db/index.js';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { activity } from '../auth.js';

const SPACE = resolve(process.cwd(), '../data/backups');
mkdirSync(SPACE, { recursive: true });
const TABLES = ['conversations', 'messages', 'customers', 'chat_records', 'kb_documents', 'kb_chunks', 'tables', 'products', 'price_history', 'stock_movements', 'staff', 'assignments', 'followups', 'orders', 'competitor_pricing', 'scripts', 'surveys', 'approvals', 'webhooks', 'automation_rules', 'voice_notes', 'customer_comments', 'users', 'activity_log', 'settings'];

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.post('/backup', async (c) => {
    if (u(c).role !== 'admin') return c.json({ error: '需要管理员权限' }, 403);
    const dump = { created_at: Date.now(), data: {} };
    for (const t of TABLES) { try { dump.data[t] = db.prepare(`SELECT * FROM ${t}`).all(); } catch {} }
    const file = `${SPACE}/backup-${Date.now()}.json`;
    writeFileSync(file, JSON.stringify(dump));
    activity.log(u(c), 'backup', 'system', null, '导出全库备份');
    return c.json({ ok: true, file: file.split('/').pop(), tables: Object.keys(dump.data).length, records: Object.values(dump.data).reduce((s, a) => s + a.length, 0) });
  });
  api.get('/backup/list', (c) => c.json(readdirSync(SPACE).map(f => ({ file: f, size: readFileSync(SPACE + '/' + f).length, at: +f.replace(/\D/g, '') || 0 })).sort((a, b) => b.at - a.at).slice(0, 20)));
  api.get('/backup/download/:file', (c) => { const f = c.req.param('file'); if (f.includes('..') || !f.endsWith('.json')) return c.json({ error: '文件名非法' }, 400); const buf = readFileSync(SPACE + '/' + f); return new Response(buf, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${f}"` } }); });
  api.post('/backup/restore', async (c) => {
    if (u(c).role !== 'admin') return c.json({ error: '需要管理员权限' }, 403);
    const { data } = await c.req.json(); if (!data) return c.json({ error: '缺少 data' }, 400);
    let restored = 0;
    for (const t of TABLES) { if (Array.isArray(data[t]) && data[t].length) { try { db.prepare(`DELETE FROM ${t}`).run(); for (const row of data[t]) { const keys = Object.keys(row); const cols = keys.join(','); const qs = keys.map(() => '?').join(','); db.prepare(`INSERT INTO ${t}(${cols}) VALUES(${qs})`).run(...keys.map(k => row[k])); restored++; } } catch (e) { console.warn('restore', t, e.message); } } }
    activity.log(u(c), 'restore', 'system', null, `恢复备份 ${restored} 条`);
    return c.json({ ok: true, restored });
  });
}
