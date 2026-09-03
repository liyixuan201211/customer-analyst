// SQLite 数据层（使用 Node 24 内置 node:sqlite，零原生依赖）
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const DB_PATH = process.env.DB_PATH || resolve(process.cwd(), '../data/analyst.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '新对话',
  customer_id TEXT,
  model TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,            -- user | assistant | tool | system
  content TEXT NOT NULL DEFAULT '',
  reasoning TEXT,
  tool_calls TEXT,               -- JSON
  tool_call_id TEXT,
  tool_name TEXT,
  attachments TEXT,              -- JSON [{type,name,url}]
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  tags TEXT NOT NULL DEFAULT '[]',   -- JSON
  profile TEXT,                      -- JSON 深层画像
  loyalty TEXT,                      -- JSON 忠诚度分析
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_records (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  source TEXT NOT NULL,       -- text | image | file
  file_name TEXT,
  content TEXT NOT NULL,      -- 归一化后的对话文本
  parsed TEXT,                -- JSON 结构化消息 [{speaker,time,text}]
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS kb_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT,
  size INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS kb_chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB               -- Float32Array
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON kb_chunks(doc_id);
CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(content, chunk_id UNINDEXED);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  title TEXT NOT NULL,
  columns TEXT NOT NULL,       -- JSON [{key,label,type}]
  rows TEXT NOT NULL,          -- JSON [{...}]
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  cost REAL NOT NULL DEFAULT 0,
  base_price REAL NOT NULL DEFAULT 0,
  current_price REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '件',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price REAL, new_price REAL,
  reason TEXT,
  factors TEXT,                -- JSON
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT,
  operator TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  department TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',   -- active | leave | inactive
  skills TEXT NOT NULL DEFAULT '[]',        -- JSON
  workload INTEGER NOT NULL DEFAULT 0,      -- 当前负责客户数
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(staff_id, customer_id)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ==================== 多人协作 / 账号 ====================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',   -- admin | member
  locale TEXT NOT NULL DEFAULT 'zh-CN',
  avatar_color TEXT DEFAULT '#4d6bfe',
  last_seen_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,            -- create/update/import/analyze/pricing/assign...
  entity TEXT NOT NULL,            -- customer/conversation/product/staff/kb/user/comments
  entity_id TEXT,
  detail TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity, entity_id);
CREATE TABLE IF NOT EXISTS customer_comments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_customer ON customer_comments(customer_id);

-- 跟进任务
CREATE TABLE IF NOT EXISTS followups (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  assignee_name TEXT,
  type TEXT NOT NULL DEFAULT 'call',      -- call | email | whatsapp | meeting | other
  subject TEXT,
  note TEXT,
  due_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | done
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_followups_customer ON followups(customer_id);
CREATE INDEX IF NOT EXISTS idx_followups_due ON followups(due_at);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);

-- 订单 / 成交（真实 RFM 金额）
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  qty REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | cancelled
  order_date INTEGER,
  created_at INTEGER NOT NULL,
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
-- 竞品对标
CREATE TABLE IF NOT EXISTS competitor_pricing (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  competitor TEXT NOT NULL,
  price REAL,
  feature_notes TEXT,
  url TEXT,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
-- 话术库
CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  scene TEXT,
  content TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- 客户问卷（NPS/满意度）
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions TEXT NOT NULL DEFAULT '{}',   -- JSON {q:type}
  responses TEXT,
  score REAL,
  status TEXT NOT NULL DEFAULT 'open',    -- open | sent | done
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_surveys_customer ON surveys(customer_id);
-- 审批流（调价/优惠）
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,             -- pricing | discount | product
  entity_id TEXT,
  subject TEXT,
  amount REAL,
  reason TEXT,
  requested_by TEXT, requested_by_name TEXT,
  approver_id TEXT, approver_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',-- pending | approved | rejected
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
-- Webhook / 集成
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  name TEXT,
  url TEXT NOT NULL,
  event TEXT NOT NULL DEFAULT '*',
  secret TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- 触发式自动化规则
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,           -- silent_days | complaint | new_order | low_stock | no_followup
  condition TEXT NOT NULL DEFAULT '{}',  -- JSON {days, keyword,...}
  action TEXT NOT NULL DEFAULT 'create_followup',  -- create_followup | notify | send_survey | tag
  action_config TEXT NOT NULL DEFAULT '{}',        -- JSON {type, subject, note, priority}
  active INTEGER NOT NULL DEFAULT 1,
  runs INTEGER NOT NULL DEFAULT 0,
  last_run_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- 语音记录
CREATE TABLE IF NOT EXISTS voice_notes (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  file_name TEXT,
  file_size INTEGER,
  duration INTEGER,
  transcript TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_voice_customer ON voice_notes(customer_id);
`);

// 安全地给已有表补列（COLUMN IF NOT EXISTS 语法在 SQLite 不支持，用 pragma 判断）
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
ensureColumn('customers', 'owner_id', "owner_id TEXT REFERENCES users(id) ON DELETE SET NULL");
ensureColumn('customers', 'visibility', "visibility TEXT NOT NULL DEFAULT 'team'");
ensureColumn('conversations', 'owner_id', "owner_id TEXT REFERENCES users(id) ON DELETE SET NULL");
ensureColumn('conversations', 'topic', "topic TEXT");
ensureColumn('conversations', 'summary', "summary TEXT");
ensureColumn('chat_records', 'owner_id', "owner_id TEXT REFERENCES users(id) ON DELETE SET NULL");
ensureColumn('staff', 'owner_id', "owner_id TEXT REFERENCES users(id) ON DELETE SET NULL");
ensureColumn('products', 'owner_id', "owner_id TEXT REFERENCES users(id) ON DELETE SET NULL");
ensureColumn('followups', 'send_status', "send_status TEXT DEFAULT 'scheduled'");   // scheduled | sent | opened | replied | failed
ensureColumn('followups', 'message_content', "message_content TEXT");
ensureColumn('followups', 'recipient', "recipient TEXT");

export const uid = () => randomUUID();
export const now = () => Date.now();
export const J = (v) => (v == null ? null : JSON.stringify(v));
export const P = (s, fallback = null) => {
  if (s == null) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};

// ---------- settings ----------
export function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? P(row.value, fallback) : fallback;
}
export function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
}

// ---------- conversations ----------
export const conversations = {
  list() {
    return db.prepare(`SELECT c.*, (SELECT count(*) FROM messages m WHERE m.conversation_id=c.id) AS message_count
      FROM conversations c ORDER BY updated_at DESC`).all();
  },
  get(id) { return db.prepare('SELECT * FROM conversations WHERE id=?').get(id); },
  create({ title, customer_id, model, owner_id } = {}) {
    const id = uid(), t = now();
    db.prepare('INSERT INTO conversations(id,title,customer_id,model,owner_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
      .run(id, title || '新对话', customer_id || null, model || null, owner_id || null, t, t);
    return this.get(id);
  },
  update(id, patch) {
    const cur = this.get(id); if (!cur) return null;
    const next = { ...cur, ...patch, updated_at: now() };
    db.prepare('UPDATE conversations SET title=?, customer_id=?, model=?, updated_at=? WHERE id=?')
      .run(next.title, next.customer_id, next.model, next.updated_at, id);
    return this.get(id);
  },
  touch(id) { db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(now(), id); },
  remove(id) { db.prepare('DELETE FROM conversations WHERE id=?').run(id); },
};

export const messages = {
  list(conversation_id) {
    return db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC, rowid ASC').all(conversation_id)
      .map(m => ({ ...m, tool_calls: P(m.tool_calls), attachments: P(m.attachments) }));
  },
  add(conversation_id, m) {
    const id = m.id || uid();
    db.prepare(`INSERT INTO messages(id,conversation_id,role,content,reasoning,tool_calls,tool_call_id,tool_name,attachments,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .run(id, conversation_id, m.role, m.content ?? '', m.reasoning ?? null, J(m.tool_calls), m.tool_call_id ?? null, m.tool_name ?? null, J(m.attachments), now());
    conversations.touch(conversation_id);
    return id;
  },
  clearAfter(conversation_id, message_id) {
    const row = db.prepare('SELECT created_at, rowid FROM messages WHERE id=?').get(message_id);
    if (!row) return;
    db.prepare('DELETE FROM messages WHERE conversation_id=? AND rowid>=?').run(conversation_id, row.rowid);
  },
};

// ---------- customers ----------
const mapCustomer = (c) => c && ({ ...c, tags: P(c.tags, []), profile: P(c.profile), loyalty: P(c.loyalty) });
export const customers = {
  list(q) {
    const rows = q
      ? db.prepare('SELECT * FROM customers WHERE name LIKE ? OR company LIKE ? OR phone LIKE ? ORDER BY updated_at DESC').all(`%${q}%`, `%${q}%`, `%${q}%`)
      : db.prepare('SELECT * FROM customers ORDER BY updated_at DESC').all();
    return rows.map(mapCustomer);
  },
  get(id) { return mapCustomer(db.prepare('SELECT * FROM customers WHERE id=?').get(id)); },
  findByName(name) { return mapCustomer(db.prepare('SELECT * FROM customers WHERE name=? LIMIT 1').get(name)); },
  create(c) {
    const id = uid(), t = now();
    db.prepare('INSERT INTO customers(id,name,company,phone,tags,profile,loyalty,notes,owner_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, c.name, c.company ?? null, c.phone ?? null, JSON.stringify(c.tags ?? []), J(c.profile), J(c.loyalty), c.notes ?? null, c.owner_id ?? null, t, t);
    return this.get(id);
  },
  update(id, patch) {
    const cur = this.get(id); if (!cur) return null;
    const n = { ...cur, ...patch };
    db.prepare('UPDATE customers SET name=?,company=?,phone=?,tags=?,profile=?,loyalty=?,notes=?,updated_at=? WHERE id=?')
      .run(n.name, n.company ?? null, n.phone ?? null, JSON.stringify(n.tags ?? []), J(n.profile), J(n.loyalty), n.notes ?? null, now(), id);
    return this.get(id);
  },
  remove(id) { db.prepare('DELETE FROM customers WHERE id=?').run(id); },
};

export const chatRecords = {
  list(customer_id) {
    return db.prepare('SELECT * FROM chat_records WHERE customer_id=? ORDER BY created_at DESC').all(customer_id)
      .map(r => ({ ...r, parsed: P(r.parsed, []) }));
  },
  add(r) {
    const id = uid();
    db.prepare('INSERT INTO chat_records(id,customer_id,source,file_name,content,parsed,owner_id,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(id, r.customer_id ?? null, r.source, r.file_name ?? null, r.content, J(r.parsed), r.owner_id ?? null, now());
    return id;
  },
  remove(id) { db.prepare('DELETE FROM chat_records WHERE id=?').run(id); },
};

// ---------- knowledge base ----------
export const kb = {
  listDocs() { return db.prepare('SELECT * FROM kb_documents ORDER BY created_at DESC').all(); },
  addDoc({ title, source, size, chunks }) {
    const id = uid();
    db.prepare('INSERT INTO kb_documents(id,title,source,size,chunk_count,created_at) VALUES(?,?,?,?,?,?)')
      .run(id, title, source ?? null, size ?? 0, chunks.length, now());
    const ins = db.prepare('INSERT INTO kb_chunks(id,doc_id,idx,content,embedding) VALUES(?,?,?,?,?)');
    const fts = db.prepare('INSERT INTO kb_fts(content, chunk_id) VALUES(?,?)');
    chunks.forEach((c, i) => {
      const cid = uid();
      ins.run(cid, id, i, c.content, c.embedding ? Buffer.from(new Float32Array(c.embedding).buffer) : null);
      fts.run(c.content, cid);
    });
    return id;
  },
  removeDoc(id) {
    const ids = db.prepare('SELECT id FROM kb_chunks WHERE doc_id=?').all(id).map(r => r.id);
    for (const cid of ids) db.prepare('DELETE FROM kb_fts WHERE chunk_id=?').run(cid);
    db.prepare('DELETE FROM kb_documents WHERE id=?').run(id);
  },
  allChunks() {
    return db.prepare('SELECT c.id, c.doc_id, c.idx, c.content, c.embedding, d.title FROM kb_chunks c JOIN kb_documents d ON d.id=c.doc_id').all();
  },
  ftsSearch(query, limit = 8) {
    // 简单分词：按空白拆分并 OR 连接；中文按 2-gram 扩展提升命中率
    const terms = query.split(/\s+/).filter(Boolean).flatMap(t => {
      if (/^[\u4e00-\u9fa5]+$/.test(t) && t.length > 2) {
        const grams = []; for (let i = 0; i < t.length - 1; i++) grams.push(t.slice(i, i + 2));
        return grams;
      }
      return [t];
    }).map(t => `"${t.replace(/"/g, '')}"`);
    if (!terms.length) return [];
    try {
      return db.prepare(`SELECT c.id, c.doc_id, c.content, d.title, bm25(kb_fts) AS score
        FROM kb_fts f JOIN kb_chunks c ON c.id=f.chunk_id JOIN kb_documents d ON d.id=c.doc_id
        WHERE kb_fts MATCH ? ORDER BY score LIMIT ?`).all(terms.join(' OR '), limit);
    } catch { return []; }
  },
};

// ---------- tables ----------
export const tables = {
  list(customer_id) {
    const rows = customer_id
      ? db.prepare('SELECT * FROM tables WHERE customer_id=? ORDER BY created_at DESC').all(customer_id)
      : db.prepare('SELECT * FROM tables ORDER BY created_at DESC').all();
    return rows.map(t => ({ ...t, columns: P(t.columns, []), rows: P(t.rows, []) }));
  },
  get(id) { const t = db.prepare('SELECT * FROM tables WHERE id=?').get(id); return t && { ...t, columns: P(t.columns, []), rows: P(t.rows, []) }; },
  add(t) {
    const id = uid();
    db.prepare('INSERT INTO tables(id,customer_id,title,columns,rows,created_at) VALUES(?,?,?,?,?,?)')
      .run(id, t.customer_id ?? null, t.title, JSON.stringify(t.columns), JSON.stringify(t.rows), now());
    return this.get(id);
  },
  remove(id) { db.prepare('DELETE FROM tables WHERE id=?').run(id); },
};

// ---------- products / pricing / stock ----------
export const products = {
  list(q) {
    return q ? db.prepare('SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? ORDER BY updated_at DESC').all(`%${q}%`, `%${q}%`, `%${q}%`)
             : db.prepare('SELECT * FROM products ORDER BY updated_at DESC').all();
  },
  get(id) { return db.prepare('SELECT * FROM products WHERE id=? OR sku=? OR name=?').get(id, id, id); },
  create(p) {
    const id = uid(), t = now();
    db.prepare('INSERT INTO products(id,sku,name,category,cost,base_price,current_price,stock,min_stock,unit,owner_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, p.sku ?? null, p.name, p.category ?? null, +p.cost || 0, +p.base_price || 0, +(p.current_price ?? p.base_price) || 0, +p.stock || 0, +p.min_stock || 0, p.unit ?? '件', p.owner_id ?? null, t, t);
    return this.get(id);
  },
  update(id, patch) {
    const cur = this.get(id); if (!cur) return null;
    const n = { ...cur, ...patch };
    db.prepare('UPDATE products SET sku=?,name=?,category=?,cost=?,base_price=?,current_price=?,stock=?,min_stock=?,unit=?,updated_at=? WHERE id=?')
      .run(n.sku ?? null, n.name, n.category ?? null, +n.cost, +n.base_price, +n.current_price, +n.stock, +n.min_stock, n.unit, now(), cur.id);
    return this.get(cur.id);
  },
  remove(id) { db.prepare('DELETE FROM products WHERE id=?').run(id); },
  setPrice(id, new_price, reason, factors) {
    const cur = this.get(id); if (!cur) return null;
    db.prepare('INSERT INTO price_history(id,product_id,old_price,new_price,reason,factors,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(uid(), cur.id, cur.current_price, new_price, reason ?? null, J(factors), now());
    return this.update(cur.id, { current_price: new_price });
  },
  priceHistory(id, limit = 20) {
    return db.prepare('SELECT * FROM price_history WHERE product_id=? ORDER BY created_at DESC LIMIT ?').all(id, limit).map(h => ({ ...h, factors: P(h.factors) }));
  },
  moveStock(id, delta, reason, operator) {
    const cur = this.get(id); if (!cur) return null;
    db.prepare('INSERT INTO stock_movements(id,product_id,delta,reason,operator,created_at) VALUES(?,?,?,?,?,?)')
      .run(uid(), cur.id, delta, reason ?? null, operator ?? null, now());
    return this.update(cur.id, { stock: cur.stock + delta });
  },
  stockMovements(id, limit = 20) {
    return db.prepare('SELECT * FROM stock_movements WHERE product_id=? ORDER BY created_at DESC LIMIT ?').all(id, limit);
  },
};

const mapStaff = (s) => s && ({ ...s, skills: P(s.skills, []) });
export const staff = {
  list() {
    return db.prepare(`SELECT s.*, (SELECT count(*) FROM assignments a WHERE a.staff_id=s.id) AS workload FROM staff s ORDER BY created_at ASC`).all().map(mapStaff);
  },
  get(id) { return mapStaff(db.prepare('SELECT * FROM staff WHERE id=? OR name=?').get(id, id)); },
  create(s) {
    const id = uid(), t = now();
    db.prepare('INSERT INTO staff(id,name,role,department,phone,status,skills,owner_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(id, s.name, s.role ?? null, s.department ?? null, s.phone ?? null, s.status ?? 'active', JSON.stringify(s.skills ?? []), s.owner_id ?? null, t, t);
    return this.get(id);
  },
  update(id, patch) {
    const cur = this.get(id); if (!cur) return null;
    const n = { ...cur, ...patch };
    db.prepare('UPDATE staff SET name=?,role=?,department=?,phone=?,status=?,skills=?,updated_at=? WHERE id=?')
      .run(n.name, n.role ?? null, n.department ?? null, n.phone ?? null, n.status, JSON.stringify(n.skills ?? []), now(), cur.id);
    return this.get(cur.id);
  },
  remove(id) { db.prepare('DELETE FROM staff WHERE id=?').run(id); },
  assign(staff_id, customer_id, note) {
    db.prepare('INSERT OR REPLACE INTO assignments(id,staff_id,customer_id,note,created_at) VALUES(?,?,?,?,?)').run(uid(), staff_id, customer_id, note ?? null, now());
  },
  unassign(staff_id, customer_id) { db.prepare('DELETE FROM assignments WHERE staff_id=? AND customer_id=?').run(staff_id, customer_id); },
  assignments() {
    return db.prepare(`SELECT a.*, s.name AS staff_name, c.name AS customer_name FROM assignments a
      JOIN staff s ON s.id=a.staff_id JOIN customers c ON c.id=a.customer_id ORDER BY a.created_at DESC`).all();
  },
};

// ---------- 跟进任务 ----------
export const followups = {
  list({ status, customer_id, assignee_id, limit = 200 } = {}) {
    let sql = `SELECT f.*, c.name AS customer_name, c.company AS customer_company FROM followups f
      LEFT JOIN customers c ON c.id=f.customer_id WHERE 1=1`;
    const args = [];
    if (status === 'pending' || status === 'done') { sql += ' AND f.status=?'; args.push(status); }
    if (status === 'open') { sql += " AND f.status='pending' AND f.due_at < ?"; args.push(now()); }
    if (status === 'today') { sql += " AND f.status='pending' AND f.due_at BETWEEN ? AND ?"; const d = new Date(); d.setHours(0,0,0,0); args.push(d.getTime(), d.getTime() + 864e5); }
    if (status === 'upcoming') { sql += " AND f.status='pending' AND f.due_at >= ?"; args.push(now() - 864e5); }
    if (customer_id) { sql += ' AND f.customer_id=?'; args.push(customer_id); }
    if (assignee_id) { sql += ' AND f.assignee_id=?'; args.push(assignee_id); }
    sql += ' ORDER BY f.status ASC, f.due_at ASC LIMIT ?'; args.push(limit);
    return db.prepare(sql).all(...args);
  },
  get(id) { return db.prepare('SELECT f.*, c.name AS customer_name FROM followups f LEFT JOIN customers c ON c.id=f.customer_id WHERE f.id=?').get(id); },
  create(f) {
    const id = uid(), t = now();
    db.prepare('INSERT INTO followups(id,customer_id,assignee_id,assignee_name,type,subject,note,due_at,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, f.customer_id ?? null, f.assignee_id ?? null, f.assignee_name ?? null, f.type || 'call', f.subject ?? null, f.note ?? null, f.due_at ?? null, f.status || 'pending', f.created_by ?? null, t, t);
    return this.get(id);
  },
  update(id, patch) {
    const cur = this.get(id); if (!cur) return null;
    const n = { ...cur, ...patch, updated_at: now() };
    db.prepare('UPDATE followups SET customer_id=?,assignee_id=?,assignee_name=?,type=?,subject=?,note=?,due_at=?,status=?,updated_at=? WHERE id=?')
      .run(n.customer_id ?? null, n.assignee_id ?? null, n.assignee_name ?? null, n.type, n.subject ?? null, n.note ?? null, n.due_at ?? null, n.status, n.updated_at, id);
    return this.get(id);
  },
  setStatus(id, status) { return this.update(id, { status }); },
  remove(id) { db.prepare('DELETE FROM followups WHERE id=?').run(id); },
  countPending() {
    return db.prepare("SELECT count(*) AS n FROM followups WHERE status='pending'").get().n;
  },
};

// ---------- 订单 / 成交 ----------
export const orders = {
  list({ customer_id, status, product_id, limit = 300 } = {}) {
    let sql = `SELECT o.*, c.name AS customer_name FROM orders o LEFT JOIN customers c ON c.id=o.customer_id WHERE 1=1`;
    const args = [];
    if (customer_id) { sql += ' AND o.customer_id=?'; args.push(customer_id); }
    if (status) { sql += ' AND o.status=?'; args.push(status); }
    if (product_id) { sql += ' AND o.product_id=?'; args.push(product_id); }
    sql += ' ORDER BY o.order_date DESC, o.created_at DESC LIMIT ?'; args.push(limit);
    return db.prepare(sql).all(...args);
  },
  get(id) { return db.prepare('SELECT * FROM orders WHERE id=?').get(id); },
  create(o) {
    const id = uid(), t = now();
    db.prepare('INSERT INTO orders(id,customer_id,product_id,product_name,qty,unit_price,amount,currency,status,order_date,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, o.customer_id ?? null, o.product_id ?? null, o.product_name ?? null, +o.qty || 0, +o.unit_price || 0, +(o.qty * o.unit_price || o.amount) || 0, o.currency || 'CNY', o.status || 'pending', o.order_date ?? now(), t, o.created_by ?? null);
    return this.get(id);
  },
  update(id, patch) {
    const cur = this.get(id); if (!cur) return null;
    const n = { ...cur, ...patch };
    db.prepare('UPDATE orders SET customer_id=?,product_id=?,product_name=?,qty=?,unit_price=?,amount=?,currency=?,status=?,order_date=? WHERE id=?')
      .run(n.customer_id ?? null, n.product_id ?? null, n.product_name ?? null, +n.qty, +n.unit_price, +(n.qty * n.unit_price || n.amount) || 0, n.currency, n.status, n.order_date ?? cur.order_date, id);
    return this.get(id);
  },
  remove(id) { db.prepare('DELETE FROM orders WHERE id=?').run(id); },
  totalByCustomer(customer_id) { const r = db.prepare("SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS n FROM orders WHERE customer_id=? AND status IN ('paid','pending','completed')").get(customer_id); return { amount: +r.total, count: +r.n }; },
};

// ---------- 竞品对标 ----------
export const competitorPricing = {
  list({ product_name, competitor } = {}) {
    let sql = 'SELECT * FROM competitor_pricing WHERE 1=1'; const a = [];
    if (product_name) { sql += ' AND product_name LIKE ?'; a.push('%' + product_name + '%'); }
    if (competitor) { sql += ' AND competitor LIKE ?'; a.push('%' + competitor + '%'); }
    sql += ' ORDER BY updated_at DESC'; return db.prepare(sql).all(...a);
  },
  create(c) { const id = uid(), t = now(); db.prepare('INSERT INTO competitor_pricing(id,product_name,competitor,price,feature_notes,url,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id, c.product_name, c.competitor, c.price ?? null, c.feature_notes ?? null, c.url ?? null, t, t); return db.prepare('SELECT * FROM competitor_pricing WHERE id=?').get(id); },
  update(id, c) { const cur = db.prepare('SELECT * FROM competitor_pricing WHERE id=?').get(id); if (!cur) return null; const n = { ...cur, ...c, updated_at: now() }; db.prepare('UPDATE competitor_pricing SET product_name=?,competitor=?,price=?,feature_notes=?,url=?,updated_at=? WHERE id=?').run(n.product_name, n.competitor, n.price ?? null, n.feature_notes ?? null, n.url ?? null, n.updated_at, id); return db.prepare('SELECT * FROM competitor_pricing WHERE id=?').get(id); },
  remove(id) { db.prepare('DELETE FROM competitor_pricing WHERE id=?').run(id); },
};

// ---------- 话术库 ----------
export const scripts = {
  list({ category, scene, q, limit = 300 } = {}) {
    let sql = 'SELECT * FROM scripts WHERE 1=1'; const a = [];
    if (category) { sql += ' AND category=?'; a.push(category); }
    if (scene) { sql += ' AND scene=?'; a.push(scene); }
    if (q) { sql += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)'; a.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    sql += ' ORDER BY updated_at DESC LIMIT ?'; a.push(limit); return db.prepare(sql).all(...a);
  },
  create(s) { const id = uid(), t = now(); db.prepare('INSERT INTO scripts(id,title,category,scene,content,tags,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id, s.title, s.category ?? null, s.scene ?? null, s.content, JSON.stringify(s.tags ?? []), t, t); return db.prepare('SELECT * FROM scripts WHERE id=?').get(id); },
  remove(id) { db.prepare('DELETE FROM scripts WHERE id=?').run(id); },
  categories() { return db.prepare('SELECT DISTINCT category FROM scripts WHERE category IS NOT NULL').all().map(r => r.category); },
};

// ---------- 问卷 ----------
export const surveys = {
  list({ customer_id, status, limit = 200 } = {}) {
    let sql = 'SELECT s.*, c.name AS customer_name FROM surveys s LEFT JOIN customers c ON c.id=s.customer_id WHERE 1=1'; const a = [];
    if (customer_id) { sql += ' AND s.customer_id=?'; a.push(customer_id); } if (status) { sql += ' AND s.status=?'; a.push(status); }
    sql += ' ORDER BY s.created_at DESC LIMIT ?'; a.push(limit); return db.prepare(sql).all(...a).map(r => ({ ...r, questions: P(r.questions, {}), responses: P(r.responses, {}) }));
  },
  create(s) { const id = uid(), t = now(); db.prepare('INSERT INTO surveys(id,customer_id,title,questions,responses,score,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id, s.customer_id ?? null, s.title, JSON.stringify(s.questions ?? {}), J(s.responses), s.score ?? null, s.status || 'open', t, t); return this.get(id); },
  get(id) { const r = db.prepare('SELECT * FROM surveys WHERE id=?').get(id); return r && { ...r, questions: P(r.questions, {}), responses: P(r.responses, {}) }; },
  update(id, patch) { const cur = this.get(id); if (!cur) return null; const n = { ...cur, ...patch, updated_at: now() }; db.prepare('UPDATE surveys SET customer_id=?,title=?,questions=?,responses=?,score=?,status=?,updated_at=? WHERE id=?').run(n.customer_id ?? null, n.title, JSON.stringify(n.questions ?? {}), J(n.responses), n.score ?? null, n.status, n.updated_at, id); return this.get(id); },
  remove(id) { db.prepare('DELETE FROM surveys WHERE id=?').run(id); },
};

// ---------- 审批流 ----------
export const approvals = {
  list({ status, entity_type, limit = 200 } = {}) {
    let sql = 'SELECT * FROM approvals WHERE 1=1'; const a = [];
    if (status) { sql += ' AND status=?'; a.push(status); } if (entity_type) { sql += ' AND entity_type=?'; a.push(entity_type); }
    sql += ' ORDER BY created_at DESC LIMIT ?'; a.push(limit); return db.prepare(sql).all(...a);
  },
  create(a) { const id = uid(), t = now(); db.prepare('INSERT INTO approvals(id,entity_type,entity_id,subject,amount,reason,requested_by,requested_by_name,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, a.entity_type, a.entity_id ?? null, a.subject ?? null, a.amount ?? null, a.reason ?? null, a.requested_by ?? null, a.requested_by_name ?? null, 'pending', t); return db.prepare('SELECT * FROM approvals WHERE id=?').get(id); },
  review(id, status, approver_id, approver_name) { db.prepare('UPDATE approvals SET status=?, approver_id=?, approver_name=?, reviewed_at=? WHERE id=?').run(status, approver_id ?? null, approver_name ?? null, now(), id); return db.prepare('SELECT * FROM approvals WHERE id=?').get(id); },
  countPending() { return db.prepare("SELECT count(*) AS n FROM approvals WHERE status='pending'").get().n; },
};

// ---------- Webhooks ----------
export const webhooks = {
  list() { return db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all(); },
  create(w) { const id = uid(); db.prepare('INSERT INTO webhooks(id,name,url,event,secret,enabled,created_at) VALUES(?,?,?,?,?,?,?)').run(id, w.name ?? null, w.url, w.event || '*', w.secret ?? null, w.enabled ? 1 : 0, now()); return db.prepare('SELECT * FROM webhooks WHERE id=?').get(id); },
  update(id, w) { const cur = db.prepare('SELECT * FROM webhooks WHERE id=?').get(id); if (!cur) return null; const n = { ...cur, ...w }; db.prepare('UPDATE webhooks SET name=?,url=?,event=?,secret=?,enabled=? WHERE id=?').run(n.name ?? null, n.url, n.event || '*', n.secret ?? null, n.enabled ? 1 : 0, id); return db.prepare('SELECT * FROM webhooks WHERE id=?').get(id); },
  remove(id) { db.prepare('DELETE FROM webhooks WHERE id=?').run(id); },
};

// ---------- 自动化规则 ----------
export const automationRules = {
  list({ active, trigger, limit = 200 } = {}) {
    let sql = 'SELECT * FROM automation_rules WHERE 1=1'; const a = [];
    if (active != null) { sql += ' AND active=?'; a.push(active ? 1 : 0); }
    if (trigger) { sql += ' AND trigger=?'; a.push(trigger); }
    sql += ' ORDER BY created_at DESC LIMIT ?'; a.push(limit);
    return db.prepare(sql).all(...a).map(r => ({ ...r, condition: P(r.condition, {}), action_config: P(r.action_config, {}), active: !!r.active }));
  },
  get(id) { const r = db.prepare('SELECT * FROM automation_rules WHERE id=?').get(id); return r && { ...r, condition: P(r.condition, {}), action_config: P(r.action_config, {}), active: !!r.active }; },
  create(r) { const id = uid(), t = now(); db.prepare('INSERT INTO automation_rules(id,name,trigger,condition,action,action_config,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id, r.name, r.trigger, JSON.stringify(r.condition ?? {}), r.action || 'create_followup', JSON.stringify(r.action_config ?? {}), r.active === false ? 0 : 1, t, t); return this.get(id); },
  update(id, p) { const cur = this.get(id); if (!cur) return null; const n = { ...cur, ...p, updated_at: now() }; db.prepare('UPDATE automation_rules SET name=?,trigger=?,condition=?,action=?,action_config=?,active=?,updated_at=? WHERE id=?').run(n.name, n.trigger, JSON.stringify(n.condition ?? {}), n.action, JSON.stringify(n.action_config ?? {}), n.active === false ? 0 : 1, n.updated_at, id); return this.get(id); },
  remove(id) { db.prepare('DELETE FROM automation_rules WHERE id=?').run(id); },
  bump(id) { db.prepare('UPDATE automation_rules SET runs=runs+1, last_run_at=? WHERE id=?').run(now(), id); },
};

// ---------- 语音记录 ----------
export const voiceNotes = {
  list({ customer_id, limit = 200 } = {}) {
    let sql = 'SELECT v.*, c.name AS customer_name FROM voice_notes v LEFT JOIN customers c ON c.id=v.customer_id WHERE 1=1'; const a = [];
    if (customer_id) { sql += ' AND v.customer_id=?'; a.push(customer_id); }
    sql += ' ORDER BY v.created_at DESC LIMIT ?'; a.push(limit);
    return db.prepare(sql).all(...a);
  },
  create(v) { const id = uid(); db.prepare('INSERT INTO voice_notes(id,customer_id,file_name,file_size,duration,transcript,created_at,created_by) VALUES(?,?,?,?,?,?,?,?)').run(id, v.customer_id ?? null, v.file_name ?? null, v.file_size ?? null, v.duration ?? null, v.transcript ?? null, now(), v.created_by ?? null); return db.prepare('SELECT * FROM voice_notes WHERE id=?').get(id); },
  update(id, p) { db.prepare('UPDATE voice_notes SET transcript=COALESCE(?,transcript), duration=COALESCE(?,duration) WHERE id=?').run(p.transcript ?? null, p.duration ?? null, id); return db.prepare('SELECT * FROM voice_notes WHERE id=?').get(id); },
  remove(id) { db.prepare('DELETE FROM voice_notes WHERE id=?').run(id); },
};
