import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { conversations, messages, customers, chatRecords, tables, products, staff, kb, followups, getSetting, setSetting, uid, db } from '../db/index.js';
import { runAgent } from '../agent/runtime.js';
import { MODEL_REGISTRY, DEFAULTS, listRemoteModels } from '../llm/aiping.js';
import { ocrChatScreenshot, parseChatText, toTranscript, saveRecord, guessCustomerName } from '../tools/importer.js';
import { ingestDocument, searchKnowledge } from '../tools/knowledge.js';
import { buildProfile, analyzeLoyalty, buildTableAndAdvice, computeRFM, segmentAll, generateFollowupMessage } from '../tools/analysis.js';
import { computePrice, pricingForCustomer } from '../tools/pricing.js';
import { webSearch } from '../tools/web.js';
import { buildCustomerReportCSV, buildAllCustomersReportCSV, buildCustomerReportXLSX, buildAllCustomersReportXLSX } from '../tools/report.js';
import { users, sessions, activity, comments, resolveUser, verifyPassword, hashPassword } from '../auth.js';

export const api = new Hono();

api.onError((err, c) => { console.error(err); return c.json({ error: err.message || String(err) }, 500); });

// ---------- 鉴权中间件（/auth/* 公开，其余需登录） ----------
api.use('*', async (c, next) => {
  const path = c.req.path;
  if (path.endsWith('/auth/login') || path.endsWith('/auth/register')) return next();
  const user = resolveUser(c.req.raw.headers);
  if (!user) return c.json({ error: '未登录或会话已过期', code: 'UNAUTHENTICATED' }, 401);
  c.set('user', user);
  return next();
});
const me = (c) => c.get('user');

// ---------- 认证 ----------
api.post('/auth/login', async (c) => {
  const { username, password } = await c.req.json().catch(() => ({}));
  const u = users.byUsername(username);
  if (!u || !verifyPassword(password || '', u.password_hash)) return c.json({ error: '用户名或密码错误' }, 401);
  const token = sessions.create(u.id);
  const { password_hash, ...safe } = u;
  return c.json({ token, user: safe });
});
api.post('/auth/register', async (c) => {
  const { username, password, display_name, locale } = await c.req.json().catch(() => ({}));
  if (!username || !password || username.length < 2 || password.length < 4) return c.json({ error: '用户名至少 2 位，密码至少 4 位' }, 400);
  if (users.byUsername(username)) return c.json({ error: '用户名已存在' }, 409);
  const u = users.create({ username, password, display_name, role: 'member', locale });
  const token = sessions.create(u.id);
  const { password_hash, ...safe } = u;
  console.log('[auth] 注册新成员', username);
  return c.json({ token, user: safe });
});
api.post('/auth/logout', (c) => { sessions.remove(sessions.get(c.req.header('authorization')?.slice(7))?.token || ''); return c.json({ ok: true }); });
api.get('/auth/me', (c) => { const u = me(c); const { password_hash, ...safe } = u; return c.json({ user: safe }); });
api.patch('/auth/me', async (c) => {
  const u = me(c);
  const b = await c.req.json().catch(() => ({}));
  if (b.password) { // 修改密码
    dbUpdatePassword(u.id, hashPassword(b.password));
  }
  const updated = users.update(u.id, { display_name: b.display_name, locale: b.locale, avatar_color: b.avatar_color });
  const { password_hash, ...safe } = updated;
  return c.json({ user: safe });
});

// ---------- 成员管理（管理员） ----------
api.get('/users', (c) => {
  if (me(c).role !== 'admin') return c.json({ error: '需要管理员权限' }, 403);
  return c.json(users.list());
});
api.post('/users', async (c) => {
  if (me(c).role !== 'admin') return c.json({ error: '需要管理员权限' }, 403);
  const b = await c.req.json();
  if (!b.username || !b.password) return c.json({ error: '缺少用户名或密码' }, 400);
  if (users.byUsername(b.username)) return c.json({ error: '用户名已存在' }, 409);
  const u = users.create({ username: b.username, password: b.password, display_name: b.display_name, role: b.role || 'member', locale: b.locale });
  const { password_hash, ...safe } = u;
  activity.log(me(c), 'invite', 'user', u.id, `邀请成员 ${safe.display_name}`);
  return c.json({ user: safe });
});
api.delete('/users/:id', (c) => {
  if (me(c).role !== 'admin') return c.json({ error: '需要管理员权限' }, 403);
  if (me(c).id === c.req.param('id')) return c.json({ error: '不能删除自己' }, 400);
  users.remove(c.req.param('id')); return c.json({ ok: true });
});

// ---------- 协作：活动流 / 评论 ----------
api.get('/activity', (c) => c.json(activity.list(+c.req.query('limit') || 50)));
api.get('/comments', (c) => c.json(comments.list(c.req.query('customer_id') || '')));
api.post('/comments', async (c) => {
  const { customer_id, text } = await c.req.json();
  if (!customer_id || !text?.trim()) return c.json({ error: '缺少参数' }, 400);
  const cm = comments.add(customer_id, me(c), text.trim());
  activity.log(me(c), 'comment', 'customer', customer_id, '添加了评论');
  return c.json(cm);
});
api.delete('/comments/:id', (c) => { comments.remove(c.req.param('id')); return c.json({ ok: true }); });

// ---------- 模型 / 设置 ----------
api.get('/models', async (c) => {
  const settings = getSetting('models', {});
  let remote = null;
  if (c.req.query('remote') === '1') { try { remote = await listRemoteModels(); } catch (e) { remote = { error: e.message }; } }
  return c.json({ registry: MODEL_REGISTRY, defaults: DEFAULTS, selected: { ...DEFAULTS, ...settings }, remote });
});
api.put('/settings/models', async (c) => { const body = await c.req.json(); setSetting('models', { ...getSetting('models', {}), ...body }); return c.json({ ok: true, selected: { ...DEFAULTS, ...getSetting('models', {}) } }); });

// ---------- 会话 ----------
api.get('/conversations', (c) => c.json(conversations.list()));
api.post('/conversations', async (c) => { const b = await c.req.json().catch(() => ({})); const conv = conversations.create({ ...b, owner_id: me(c).id }); return c.json(conv); });
api.get('/conversations/:id', (c) => { const conv = conversations.get(c.req.param('id')); if (!conv) return c.json({ error: 'not found' }, 404); return c.json({ ...conv, owner: conv.owner_id ? users.byId(conv.owner_id)?.display_name : null, messages: messages.list(conv.id) }); });
api.patch('/conversations/:id', async (c) => c.json(conversations.update(c.req.param('id'), await c.req.json())));
api.delete('/conversations/:id', (c) => { conversations.remove(c.req.param('id')); return c.json({ ok: true }); });

/**
 * 发送消息并以 SSE 流式返回 Agent 响应
 * body: { content, attachments?: [{type:'image'|'file', name, dataUrl?|text?}] }
 */
api.post('/conversations/:id/messages', async (c) => {
  const id = c.req.param('id');
  const conv = conversations.get(id);
  if (!conv) return c.json({ error: 'not found' }, 404);
  const body = await c.req.json();
  let content = body.content || '';
  const attachments = [];

  for (const a of body.attachments || []) {
    if (a.type === 'image' && a.dataUrl) attachments.push({ type: 'image', name: a.name, dataUrl: a.dataUrl });
    else if (a.type === 'file' && a.text) { attachments.push({ type: 'file', name: a.name, size: a.text.length }); content += `\n\n【附件文件：${a.name}】\n${a.text.slice(0, 30000)}`; }
  }
  const images = attachments.filter(a => a.type === 'image');
  const userMsgId = uid();

  return streamSSE(c, async (stream) => {
    const emit = (ev) => stream.writeSSE({ data: JSON.stringify(ev) });
    try {
      if (images.length) {
        emit({ type: 'status', text: `正在识别 ${images.length} 张聊天截图…` });
        try { const { raw } = await ocrChatScreenshot(images.map(i => i.dataUrl)); content += `\n\n【系统已将 ${images.length} 张聊天截图识别为文本如下，请按需使用 import_chat_text 导入】\n${raw}`; emit({ type: 'status', text: '截图识别完成' }); }
        catch (e) { content += `\n\n【截图识别失败：${e.message}】`; emit({ type: 'status', text: '截图识别失败：' + e.message }); }
      }
      messages.add(id, { id: userMsgId, role: 'user', content, attachments: attachments.map(a => ({ type: a.type, name: a.name, dataUrl: a.type === 'image' ? a.dataUrl : undefined })) });
      emit({ type: 'user_message', id: userMsgId, content });
      activity.log(me(c), 'chat', 'conversation', id, '发送消息并调用智能体');
      await runAgent({ conversation_id: id, emit, signal: c.req.raw.signal, locale: me(c)?.locale, actor: me(c) });
    } catch (e) { console.error(e); emit({ type: 'error', message: e.message || String(e) }); }
  });
});
api.post('/conversations/:id/regenerate', async (c) => {
  const id = c.req.param('id');
  if (!conversations.get(id)) return c.json({ error: 'not found' }, 404);
  const { message_id } = await c.req.json();
  if (message_id) messages.clearAfter(id, message_id);
  return streamSSE(c, async (stream) => {
    const emit = (ev) => stream.writeSSE({ data: JSON.stringify(ev) });
    try { await runAgent({ conversation_id: id, emit, signal: c.req.raw.signal, locale: me(c)?.locale, actor: me(c) }); }
    catch (e) { emit({ type: 'error', message: e.message || String(e) }); }
  });
});
api.delete('/conversations/:id/messages/:mid', (c) => { messages.clearAfter(c.req.param('id'), c.req.param('mid')); return c.json({ ok: true }); });

// ---------- 客户 ----------
const enrichCustomer = (cu) => cu && ({ ...cu, owner: cu.owner_id ? users.byId(cu.owner_id)?.display_name || users.byId(cu.owner_id)?.username : null });
api.get('/customers', (c) => {
  const u = me(c); const q = c.req.query('q');
  let list = customers.list(q);
  if (u.role !== 'admin') list = list.filter(x => x.visibility === 'team' || x.owner_id === u.id || !x.owner_id);
  return c.json(list.map(enrichCustomer));
});
api.post('/customers', async (c) => { const b = await c.req.json(); const cu = customers.create({ ...b, owner_id: me(c).id }); activity.log(me(c), 'create', 'customer', cu.id, `创建客户 ${cu.name}`); return c.json(enrichCustomer(cu)); });
api.get('/customers/:id', (c) => {
  const cu = customers.get(c.req.param('id')); if (!cu) return c.json({ error: 'not found' }, 404);
  const u = me(c); if (cu.visibility === 'private' && u.role !== 'admin' && cu.owner_id !== u.id) return c.json({ error: '无权访问该私有客户' }, 403); return c.json({ ...enrichCustomer(cu), records: chatRecords.list(cu.id), tables: tables.list(cu.id), comments: comments.list(cu.id), assignments: staff.assignments().filter(a => a.customer_id === cu.id) }); });
api.patch('/customers/:id', async (c) => { const cu = customers.update(c.req.param('id'), await c.req.json()); if (cu) { activity.log(me(c), 'update', 'customer', cu.id, `更新客户 ${cu.name}`); return c.json(enrichCustomer(cu)); } return c.json({ error: 'not found' }, 404); });
api.delete('/customers/:id', (c) => { customers.remove(c.req.param('id')); activity.log(me(c), 'delete', 'customer', c.req.param('id'), '删除客户'); return c.json({ ok: true }); });
api.delete('/customers/:id/records/:rid', (c) => { chatRecords.remove(c.req.param('rid')); return c.json({ ok: true }); });
api.post('/customers/:id/profile', async (c) => { const p = await buildProfile(c.req.param('id')); activity.log(me(c), 'analyze', 'customer', c.req.param('id'), '生成客户画像'); return c.json(p); });
api.post('/customers/:id/loyalty', async (c) => { const l = await analyzeLoyalty(c.req.param('id')); activity.log(me(c), 'analyze', 'customer', c.req.param('id'), `忠诚度分析 ${l.score}`); return c.json(l); });
api.post('/customers/:id/table', async (c) => { const r = await buildTableAndAdvice(c.req.param('id'), (await c.req.json().catch(() => ({}))).focus); activity.log(me(c), 'analyze', 'customer', c.req.param('id'), '生成多维表格与话术'); return c.json(r); });

// 客户综合报表 CSV
api.get('/customers/:id/report.csv', (c) => {
  const csv = buildCustomerReportCSV(c.req.param('id'), c.req.query('locale') || 'zh-CN');
  if (!csv) return c.text('not found', 404);
  const cu = customers.get(c.req.param('id'));
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('客户报告-' + cu.name)}.csv` } });
});
// 全部客户汇总报表 CSV
api.get('/report.csv', (c) => new Response(buildAllCustomersReportCSV(c.req.query('locale') || 'zh-CN'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('全部客户报告.csv')}` } }));

// 直接导入（不经 Agent）
api.post('/import', async (c) => {
  const body = await c.req.json();
  let raw = body.text || '';
  if (body.images?.length) raw = (await ocrChatScreenshot(body.images)).raw;
  const parsed = parseChatText(raw);
  const content = toTranscript(parsed);
  let name = body.customer_name;
  if (!body.customer_id && !name) name = await guessCustomerName(content);
  const r = saveRecord({ customer_id: body.customer_id, customer_name: name, source: body.images?.length ? 'image' : 'text', file_name: body.file_name, content, parsed });
  activity.log(me(c), 'import', 'customer', r.customer_id, `导入聊天记录 ${parsed.length} 条`);
  return c.json({ ...r, messages: parsed.length, content });
});

// ---------- 表格 ----------
api.get('/tables', (c) => c.json(tables.list(c.req.query('customer_id'))));
api.get('/tables/:id', (c) => c.json(tables.get(c.req.param('id'))));
api.delete('/tables/:id', (c) => { tables.remove(c.req.param('id')); return c.json({ ok: true }); });
api.get('/tables/:id/csv', (c) => {
  const t = tables.get(c.req.param('id')); if (!t) return c.text('not found', 404);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [t.columns.map(col => esc(col.label)).join(','), ...t.rows.map(r => t.columns.map(col => esc(r[col.key])).join(','))].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(t.title)}.csv` } });
});

// ---------- 知识库 ----------
api.get('/kb', (c) => c.json(kb.listDocs()));
api.post('/kb', async (c) => { const b = await c.req.json(); const r = await ingestDocument({ title: b.title, text: b.text, source: b.source || 'upload' }); activity.log(me(c), 'add', 'kb', r.id, `入库知识库 ${b.title}`); return c.json(r); });
api.delete('/kb/:id', (c) => { kb.removeDoc(c.req.param('id')); return c.json({ ok: true }); });
api.get('/kb/search', async (c) => c.json(await searchKnowledge(c.req.query('q') || '', +(c.req.query('k') || 6))));

// ---------- 网络搜索 ----------
api.get('/search', async (c) => c.json(await webSearch(c.req.query('q') || '', +(c.req.query('limit') || 6))));

// ---------- 商品 / 定价 / 库存 ----------
api.get('/products', (c) => { const list = products.list(c.req.query('q')); const u = me(c); if (u.role !== 'admin') { for (const p of list) { p.cost = null; p.margin = null; } } return c.json(list); });
api.post('/products', async (c) => { const p = products.create({ ...(await c.req.json()), owner_id: me(c).id }); activity.log(me(c), 'create', 'product', p.id, `新增商品 ${p.name}`); return c.json(p); });
api.patch('/products/:id', async (c) => c.json(products.update(c.req.param('id'), await c.req.json())));
api.delete('/products/:id', (c) => { products.remove(c.req.param('id')); return c.json({ ok: true }); });
api.get('/products/:id/history', (c) => c.json({ prices: products.priceHistory(c.req.param('id')), stock: products.stockMovements(c.req.param('id')) }));
api.post('/products/:id/stock', async (c) => { const b = await c.req.json(); const r = products.moveStock(c.req.param('id'), Math.round(+b.delta), b.reason, b.operator || me(c).display_name); return c.json(r); });
api.post('/products/:id/pricing', async (c) => {
  const p = products.get(c.req.param('id')); if (!p) return c.json({ error: 'not found' }, 404);
  const b = await c.req.json().catch(() => ({}));
  const cu = b.customer_id ? customers.get(b.customer_id) : null;
  const r = computePrice(p, { ...pricingForCustomer(p, cu), ...b });
  if (b.apply) { products.setPrice(p.id, r.suggested_price, b.reason || '手动应用动态定价', r.factors); activity.log(me(c), 'pricing', 'product', p.id, `动态定价 ${p.name} → ¥${r.suggested_price}`); }
  return c.json(r);
});

// ---------- 人员 ----------
api.get('/staff', (c) => c.json({ staff: staff.list(), assignments: staff.assignments() }));
api.post('/staff', async (c) => { const s = staff.create({ ...(await c.req.json()), owner_id: me(c).id }); activity.log(me(c), 'create', 'staff', s.id, `新增员工 ${s.name}`); return c.json(s); });
api.patch('/staff/:id', async (c) => c.json(staff.update(c.req.param('id'), await c.req.json())));
api.delete('/staff/:id', (c) => { staff.remove(c.req.param('id')); return c.json({ ok: true }); });
api.post('/staff/:id/assign', async (c) => { const b = await c.req.json(); if (b.unassign) staff.unassign(c.req.param('id'), b.customer_id); else { staff.assign(c.req.param('id'), b.customer_id, b.note); activity.log(me(c), 'assign', 'staff', c.req.param('id'), '分配客户'); } return c.json({ ok: true }); });

// ---------- 跟进任务 ----------
api.get('/followups', (c) => c.json(followups.list({ status: c.req.query('status'), customer_id: c.req.query('customer_id'), assignee_id: c.req.query('assignee_id'), limit: +(c.req.query('limit') || 200) })));
api.post('/followups', async (c) => {
  const b = await c.req.json();
  const f = followups.create({ customer_id: b.customer_id ?? null, type: b.type || 'call', subject: b.subject, note: b.note, due_at: b.due_at ?? null, assignee_name: b.assignee_name || me(c).display_name, created_by: me(c).id });
  activity.log(me(c), 'add', 'followup', f.id, `跟进 ${f.type}: ${f.subject || ''}${b.customer_id ? ' @客户' : ''}`);
  return c.json(f);
});
api.patch('/followups/:id', async (c) => { const f = followups.update(c.req.param('id'), await c.req.json()); activity.log(me(c), 'update', 'followup', c.req.param('id'), '更新跟进任务'); return c.json(f); });
api.post('/followups/:id/complete', (c) => { const f = followups.setStatus(c.req.param('id'), 'done'); activity.log(me(c), 'update', 'followup', c.req.param('id'), '完成跟进任务'); return c.json(f); });
api.delete('/followups/:id', (c) => { followups.remove(c.req.param('id')); return c.json({ ok: true }); });

// ---------- RFM 分层 ----------
api.get('/rfm', (c) => {
  const cs = customers.list();
  const by = Object.fromEntries(cs.map(x => [x.id, chatRecords.list(x.id)]));
  return c.json(segmentAll(cs, by));
});
api.post('/customers/:id/rfm', async (c) => {
  const cu = customers.get(c.req.param('id')); if (!cu) return c.json({ error: 'not found' }, 404);
  const r = computeRFM(cu, chatRecords.list(cu.id));
  customers.update(cu.id, { tags: [...new Set([...(cu.tags || []), r.segment])] });
  activity.log(me(c), 'analyze', 'customer', cu.id, `RFM 分层：${r.segment}`);
  return c.json(r);
});
api.post('/customers/:id/followup-message', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const msg = await generateFollowupMessage(c.req.param('id'), { type: b.type || 'email', language: b.language || (me(c).locale === 'en-US' ? 'en' : 'zh') });
  return c.json(msg);
});

// ---------- 客户报告 xlsx ----------
api.get('/customers/:id/report.xlsx', (c) => {
  const buf = buildCustomerReportXLSX(c.req.param('id'), c.req.query('locale') || 'zh-CN');
  if (!buf) return c.text('not found', 404);
  const cu = customers.get(c.req.param('id'));
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('客户报告-' + cu.name)}.xlsx` } });
});
api.get('/report.xlsx', (c) => new Response(buildAllCustomersReportXLSX(c.req.query('locale') || 'zh-CN'), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('全部客户报告.xlsx')}` } }));

// ---------- 仪表盘 ----------
api.get('/dashboard', (c) => {
  const cs = customers.list();
  const ps = products.list();
  const loyal = cs.filter(x => x.loyalty).map(x => x.loyalty.score);
  return c.json({
    customers: cs.length, profiled: cs.filter(x => x.profile).length,
    avg_loyalty: loyal.length ? Math.round(loyal.reduce((a, b) => a + b, 0) / loyal.length) : null,
    churn_risk: cs.filter(x => x.loyalty?.churn_risk?.level === '高').length,
    products: ps.length, low_stock: ps.filter(p => p.min_stock > 0 && p.stock < p.min_stock).length,
    inventory_value: +ps.reduce((s, p) => s + p.stock * p.cost, 0).toFixed(2),
    staff: staff.list().length, kb_docs: kb.listDocs().length, members: users.list().length,
  });
});

// 数据库更新密码辅助
function dbUpdatePassword(userId, hash) {
  return db.prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?').run(hash, Date.now(), userId);
}

// ---------- 挂载功能模块（orders/churn/... 由 features/ 提供） ----------
import { registerFeatures } from '../features/index.js';
registerFeatures(api, { me: (c) => c.get('user'), activity });
