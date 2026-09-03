// 认证模块：scrypt 加密 + token 会话
import { scryptSync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { db, now, getSetting, setSetting } from './db/index.js';

// ---------- 用户 CRUD ----------
const SECRET = process.env.SESSION_SECRET || 'analyst-session-secret';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(candidate, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export const users = {
  byUsername(u) { return db.prepare('SELECT * FROM users WHERE username=?').get(u); },
  byId(id) { return db.prepare('SELECT * FROM users WHERE id=?').get(id); },
  list() {
    return db.prepare('SELECT id, username, display_name, role, locale, avatar_color, last_seen_at, created_at FROM users ORDER BY created_at ASC').all()
      .map(u => ({ ...u, online: Date.now() - (u.last_seen_at || 0) < 60000 }));
  },
  create({ username, password, display_name, role = 'member', locale = 'zh-CN' }) {
    const id = randomUUID(), t = now();
    db.prepare('INSERT INTO users(id,username,password_hash,display_name,role,locale,avatar_color,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(id, username, hashPassword(password), display_name || username, role, locale, pickColor(), t, t);
    return this.byId(id);
  },
  update(id, patch) {
    const rows = [];
    const vals = [];
    for (const k of ['display_name', 'locale', 'avatar_color', 'role']) {
      if (patch[k] !== undefined) { rows.push(`${k}=?`); vals.push(patch[k]); }
    }
    vals.push(now(), id);
    if (rows.length) db.prepare(`UPDATE users SET ${rows.join(',')}, updated_at=? WHERE id=?`).run(...vals);
    return this.byId(id);
  },
  touch(id) { db.prepare('UPDATE users SET last_seen_at=? WHERE id=?').run(now(), id); },
  remove(id) { db.prepare('DELETE FROM users WHERE id=?').run(id); },
};

function pickColor() {
  const colors = ['#4d6bfe', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ---------- 会话 ----------
const TTL = 30 * 24 * 3600 * 1000; // 30 天
export const sessions = {
  create(userId) {
    const token = randomBytes(32).toString('hex');
    const t = now();
    db.prepare('INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(token, userId, t, t + TTL);
    return token;
  },
  get(token) {
    const s = db.prepare('SELECT * FROM sessions WHERE token=?').get(token);
    if (!s) return null;
    if (s.expires_at < now()) { db.prepare('DELETE FROM sessions WHERE token=?').run(token); return null; }
    return s;
  },
  remove(token) { db.prepare('DELETE FROM sessions WHERE token=?').run(token); },
  cleanup() { db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now()); },
};

// ---------- 活动日志（协作） ----------
export const activity = {
  log(user, action, entity, entity_id, detail) {
    if (!user) return;
    db.prepare('INSERT INTO activity_log(id,actor_id,actor_name,action,entity,entity_id,detail,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(randomUUID(), user.id, user.display_name || user.username, action, entity, entity_id ?? null, detail ?? null, now());
  },
  list(limit = 50) {
    return db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?').all(limit)
      .map(a => ({ ...a, created_at: a.created_at }));
  },
};

export const comments = {
  list(customer_id) {
    return db.prepare('SELECT * FROM customer_comments WHERE customer_id=? ORDER BY created_at ASC').all(customer_id);
  },
  add(customer_id, user, text) {
    const id = randomUUID();
    db.prepare('INSERT INTO customer_comments(id,customer_id,user_id,user_name,text,created_at) VALUES(?,?,?,?,?,?)')
      .run(id, customer_id, user.id, user.display_name || user.username, text, now());
    return db.prepare('SELECT * FROM customer_comments WHERE id=?').get(id);
  },
  remove(id) { db.prepare('DELETE FROM customer_comments WHERE id=?').run(id); },
};

// ---------- 鉴权中间件 ----------
export function tokenFromHeader(headers) {
  const h = headers.get('authorization');
  const cookieHeader = headers.get('cookie') || '';
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  const m = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? m[1] : null;
}
export function resolveUser(headers) {
  const t = tokenFromHeader(headers);
  if (!t) return null;
  const s = sessions.get(t);
  if (!s) return null;
  const u = users.byId(s.user_id);
  if (!u) return null;
  users.touch(u.id);
  return u;
}

// ---------- 启动时初始化管理员 ----------
export function ensureAdmin() {
  if (users.list().length > 0) return;
  const u = users.create({ username: 'admin', password: 'admin123', display_name: '管理员', role: 'admin' });
  setSetting('first_run', { needs_password_change: true });
  console.log('[auth] 已创建默认管理员账号 admin / admin123（首次登录后请在用户菜单改密）');
  return u;
}
