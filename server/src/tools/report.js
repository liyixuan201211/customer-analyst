// 客户综合报表：把客户档案、画像、忠诚度、多维表格合成一个可下载的 CSV
import { customers, chatRecords, tables, staff } from '../db/index.js';
import { users } from '../auth.js';

const L = {
  'zh-CN': {
    group_customer: '客户信息', group_profile: '客户画像', group_loyalty: '忠诚度', group_advice: '合作建议', group_kb: '多维表格',
    name: '客户名称', company: '公司', phone: '电话', tags: '标签', owner: '负责人', created: '建档时间', records: '聊天记录数',
    summary: '画像概述', disc: '性格类型', role: '决策角色', industry: '行业', budget: '预算水平', price_sens: '价格敏感度', price_ev: '价格敏感依据',
    decision_stage: '决策阶段', urgency: '紧迫度', risks: '关键风险', opportunities: '关键机会', pain: '痛点', needs: '明确需求', implicit: '隐性需求',
    score: '忠诚度得分', level: '等级', lifecycle: '生命周期', trend: '趋势', churn_level: '流失风险', churn_prob: '流失概率', retention: '维系动作',
    next_timing: '下次联系时机', next_topic: '建议话题', next_channel: '建议渠道', tone: '沟通语气', do: '应做', dont: '应避免', openers: '开场白', scripts: '场景话术',
    report_title: '客户分析报告', generated: '生成时间', empty: '暂无',
  },
  'en': {
    group_customer: 'Customer', group_profile: 'Profile', group_loyalty: 'Loyalty', group_advice: 'Advice', group_kb: 'Analysis Tables',
    name: 'Name', company: 'Company', phone: 'Phone', tags: 'Tags', owner: 'Owner', created: 'Created', records: 'Chat records',
    summary: 'Summary', disc: 'DISC', role: 'Role', industry: 'Industry', budget: 'Budget', price_sens: 'Price sensitivity', price_ev: 'Evidence',
    decision_stage: 'Decision stage', urgency: 'Urgency', risks: 'Key risks', opportunities: 'Opportunities', pain: 'Pain points', needs: 'Explicit needs', implicit: 'Implicit needs',
    score: 'Loyalty score', level: 'Level', lifecycle: 'Lifecycle', trend: 'Trend', churn_level: 'Churn risk', churn_prob: 'Churn probability', retention: 'Retention actions',
    next_timing: 'Next contact', next_topic: 'Suggested topic', next_channel: 'Channel', tone: 'Tone', do: 'Do', dont: 'Avoid', openers: 'Openers', scripts: 'Scripts',
    report_title: 'Customer Analysis Report', generated: 'Generated', empty: 'N/A',
  },
};

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
const dstr = (t) => t ? new Date(t).toLocaleString('zh-CN') : '';

export function buildCustomerReportCSV(customerId, locale = 'zh-CN') {
  const c = customers.get(customerId);
  if (!c) return null;
  const t = L[locale] || L['en'];
  const recs = chatRecords.list(customerId);
  const tbls = tables.list(customerId);
  const owner = c.owner_id ? users.byId(c.owner_id) : null;

  const rows = [['分组', '字段', '内容']];
  const add = (g, k, v) => rows.push([t[g] || g, t[k] || k, v]);
  const join = (a) => Array.isArray(a) ? a.filter(Boolean).join('、') : a;

  add('group_customer', 'name', c.name);
  add('group_customer', 'company', c.company || t.empty);
  add('group_customer', 'phone', c.phone || t.empty);
  add('group_customer', 'tags', join(c.tags) || t.empty);
  add('group_customer', 'owner', owner ? (owner.display_name || owner.username) : t.empty);
  add('group_customer', 'created', dstr(c.created_at));
  add('group_customer', 'records', recs.length);

  if (c.profile) {
    const p = c.profile;
    add('group_profile', 'summary', p.summary || '');
    add('group_profile', 'disc', p.personality?.type || '');
    add('group_profile', 'role', p.basic?.role || '');
    add('group_profile', 'industry', p.basic?.industry || '');
    add('group_profile', 'budget', p.basic?.budget_level || '');
    add('group_profile', 'price_sens', p.price_sensitivity?.level || '');
    add('group_profile', 'price_ev', p.price_sensitivity?.evidence || '');
    add('group_profile', 'decision_stage', p.decision?.stage || '');
    add('group_profile', 'urgency', p.decision?.urgency || '');
    add('group_profile', 'needs', join(p.needs?.explicit));
    add('group_profile', 'implicit', join(p.needs?.implicit));
    add('group_profile', 'pain', join(p.needs?.pain_points));
    add('group_profile', 'risks', join(p.risks));
    add('group_profile', 'opportunities', join(p.opportunities));
  }

  if (c.loyalty) {
    const l = c.loyalty;
    add('group_loyalty', 'score', l.score);
    add('group_loyalty', 'level', l.level);
    add('group_loyalty', 'lifecycle', l.lifecycle_stage || '');
    add('group_loyalty', 'trend', l.trend || '');
    add('group_loyalty', 'churn_level', l.churn_risk?.level || '');
    add('group_loyalty', 'churn_prob', l.churn_risk?.probability != null ? Math.round(l.churn_risk.probability * 100) + '%' : '');
    add('group_loyalty', 'retention', join(l.retention_actions));
  }

  // 建议对话方式（来自最近生成的表格附带）
  const lastTable = tbls[0];
  const guide = lastTable ? lastTable.talk_guide : null;
  if (guide) {
    add('group_advice', 'tone', guide.tone || '');
    add('group_advice', 'do', join(guide.do));
    add('group_advice', 'dont', join(guide.dont));
    add('group_advice', 'openers', join(guide.openers));
    add('group_advice', 'next_timing', c.loyalty?.next_contact?.timing || '');
    add('group_advice', 'next_topic', c.loyalty?.next_contact?.topic || '');
    add('group_advice', 'next_channel', c.loyalty?.next_contact?.channel || '');
  }

  // 表格区：每个表单独一段（表头 + 行）
  const blocks = [];
  for (const tb of tbls) {
    const cols = tb.columns; const hdr = cols.map(col => esc(col.label)).join(',');
    const body = tb.rows.map(r => cols.map(col => esc(r[col.key])).join(','));
    blocks.push([esc(tb.title), '', ''].join(','), hdr, ...body);
  }
  const csvRows = rows.map(r => r.map(esc).join(','));
  return '\uFEFF' + [esc(t.report_title), '', ''].join(',') + '\n' +
    [esc(t.generated), esc(dstr(Date.now())), ''].join(',') + '\n\n' +
    csvRows.join('\n') + '\n\n' + (blocks.length ? blocks.join('\n') : '');
}

export function buildAllCustomersReportCSV(locale = 'zh-CN') {
  const t = L[locale] || L['en'];
  const cs = customers.list();
  const escQ = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const hdr = ['客户名称', '公司', '电话', '标签', '画像概述', 'DISC', '忠诚度', '等级', '流失风险', '跟进人', '聊天记录'].map((k, i) => {
    // 用本地化标签
    const map = ['name', 'company', 'phone', 'tags', 'summary', 'disc', 'score', 'level', 'churn_level', 'owner', 'records'];
    const kk = map[i];
    const label = ({ name: t.name, company: t.company, phone: t.phone, tags: t.tags, summary: t.summary, disc: t.disc, score: t.score, level: t.level, churn_level: t.churn_level, owner: t.owner, records: t.records })[kk] || k;
    return escQ(label);
  }).join(',');
  const body = cs.map(c => {
    const owner = c.owner_id ? users.byId(c.owner_id) : null;
    return [c.name, c.company || '', c.phone || '', (c.tags || []).join('、'), c.profile?.summary || '', c.profile?.personality?.type || '',
      c.loyalty?.score ?? '', c.loyalty?.level || '', c.loyalty?.churn_risk?.level || '', owner ? (owner.display_name || owner.username) : '',
      chatRecords.list(c.id).length].map(escQ).join(',');
  });
  return '\uFEFF' + [escQ(t.report_title + ' - ' + t.generated), escQ(dstr(Date.now()))].join(',') + '\n' + hdr + '\n' + body.join('\n');
}

// ---------- Excel (.xlsx) 导出，基于 SheetJS ----------
import * as XLSX from 'xlsx';

function buildWorkbook(customerId, locale = 'zh-CN') {
  const c = customers.get(customerId);
  if (!c) return null;
  const t = L[locale] || L['en'];
  const db = new XLSX.utils.book_new();

  const rows = [];
  const add = (g, k, v) => rows.push({ [t.group_customer || '分组']: t[g] || g, [t.name || '字段']: t[k] || k, [t.empty || '内容']: v ?? '' });
  const join = (a) => Array.isArray(a) ? a.filter(Boolean).join('、') : a;
  add('group_customer', 'name', c.name); add('group_customer', 'company', c.company || '');
  add('group_customer', 'phone', c.phone || ''); add('group_customer', 'tags', join(c.tags)); add('group_customer', 'created', c.created_at);
  if (c.profile) { const p = c.profile; add('group_profile', 'summary', p.summary || ''); add('group_profile', 'disc', p.personality?.type || ''); add('group_profile', 'role', p.basic?.role || ''); add('group_profile', 'industry', p.basic?.industry || ''); add('group_profile', 'price_sens', p.price_sensitivity?.level || ''); add('group_profile', 'decision_stage', p.decision?.stage || ''); add('group_profile', 'urgency', p.decision?.urgency || ''); add('group_profile', 'needs', join(p.needs?.explicit)); add('group_profile', 'pain', join(p.needs?.pain_points)); add('group_profile', 'risks', join(p.risks)); add('group_profile', 'opportunities', join(p.opportunities)); }
  if (c.loyalty) { const l = c.loyalty; add('group_loyalty', 'score', l.score); add('group_loyalty', 'level', l.level); add('group_loyalty', 'lifecycle', l.lifecycle_stage || ''); add('group_loyalty', 'churn_level', l.churn_risk?.level || ''); add('group_loyalty', 'retention', join(l.retention_actions)); }
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(db, ws, t.group_customer || '客户信息');

  // 每个多维表格一个 sheet
  for (const tb of tables.list(customerId)) {
    const sheetRows = tb.rows.map(r => Object.fromEntries(tb.columns.map(col => [col.label, r[col.key]])));
    const tws = XLSX.utils.json_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(db, tws, String(tb.title).slice(0, 28));
  }
  return db;
}

export function buildCustomerReportXLSX(customerId, locale = 'zh-CN') {
  const db = buildWorkbook(customerId, locale);
  if (!db) return null;
  return XLSX.write(db, { bookType: 'xlsx', type: 'buffer' });
}

export function buildAllCustomersReportXLSX(locale = 'zh-CN') {
  const cs = customers.list();
  const t = L[locale] || L['en'];
  const rows = cs.map(c => {
    const owner = c.owner_id ? users.byId(c.owner_id) : null;
    return {
      [t.name]: c.name, [t.company]: c.company || '', [t.phone]: c.phone || '', [t.tags]: (c.tags || []).join('、'),
      [t.summary]: c.profile?.summary || '', [t.disc]: c.profile?.personality?.type || '',
      [t.score]: c.loyalty?.score ?? '', [t.level]: c.loyalty?.level || '', [t.churn_level]: c.loyalty?.churn_risk?.level || '',
      [t.owner]: owner ? (owner.display_name || owner.username) : '', [t.records]: chatRecords.list(c.id).length,
    };
  });
  const db = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(db, XLSX.utils.json_to_sheet(rows), (t.group_customer || '客户'));
  return XLSX.write(db, { bookType: 'xlsx', type: 'buffer' });
}
