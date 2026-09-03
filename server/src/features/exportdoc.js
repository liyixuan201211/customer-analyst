// Word / PDF / HTML 报告导出（轻量：HTML 内容即 Word(.doc)，打印即 PDF）
import { customers, tables, chatRecords } from '../db/index.js';
import { buildCustomerReportCSV, buildAllCustomersReportCSV } from '../tools/report.js';

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const esc = (v) => h(v).replace(/\r?\n/g, '<br/>');

function customerDocHtml(cu, locale) {
  const t = { 'zh-CN': { title: '客户分析报告', name: '客户名称', company: '公司', phone: '电话', profile: '画像', loyalty: '忠诚度', tables: '多维表格' }, en: { title: 'Customer Report', name: 'Name', company: 'Company', phone: 'Phone', profile: 'Profile', loyalty: 'Loyalty', tables: 'Tables' } }[locale === 'en' || locale === 'en-US' ? 'en' : 'zh-CN'];
  const p = cu.profile || {}; const l = cu.loyalty || {};
  const tablesHtml = tables.list(cu.id).map(tb => `<h3>${esc(tb.title)}</h3><table border="1" cellpadding="4" style="border-collapse:collapse;font-size:13px"><tr>${tb.columns.map(col => `<th>${esc(col.label)}</th>`).join('')}</tr>${tb.rows.map(r => `<tr>${tb.columns.map(col => `<td>${esc(r[col.key])}</td>`).join('')}</tr>`).join('')}</table>`).join('');
  return `<html><head><meta charset="utf-8"><title>${esc(t.title)}</title><style>body{font-family:-apple-system,PingFang SC,sans-serif;font-size:14px;line-height:1.7} h1{color:#4d6bfe} table{border-collapse:collapse} th{background:#f0f0f0}</style></head><body>
    <h1>${esc(t.title)}</h1>
    <p><b>${t.name}:</b> ${esc(cu.name)} ${cu.company ? `&nbsp;·&nbsp;<b>${t.company}:</b> ${esc(cu.company)}` : ''} ${cu.phone ? `&nbsp;·&nbsp;<b>${t.phone}:</b> ${esc(cu.phone)}` : ''}</p>
    <h2>${t.profile}</h2><p>${esc(p.summary || '')}</p>${p.personality ? `<p><b>DISC:</b> ${esc(p.personality.type)} &nbsp; ${(p.personality.traits || []).join('、')}</p>` : ''}<p><b>${t.loyalty}:</b> ${l.score ?? ''} ${l.level || ''}</p>
    ${tablesHtml}
  </body></html>`;
}

export default function register(api) {
  api.get('/customers/:id/report.doc', (c) => { const cu = customers.get(c.req.param('id')); if (!cu) return c.text('not found', 404); const html = customerDocHtml(cu, c.req.query('locale') || 'zh-CN'); return new Response('\uFEFF' + html, { headers: { 'Content-Type': 'application/msword; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('客户报告-' + cu.name)}.doc` } }); });
  api.get('/customers/:id/report.html', (c) => { const cu = customers.get(c.req.param('id')); if (!cu) return c.text('not found', 404); return new Response(customerDocHtml(cu, c.req.query('locale') || 'zh-CN'), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); });
  // 全部客户 CSV 已足够；此处补充全部客户的 doc 汇总
  api.get('/report.doc', (c) => { const cs = customers.list(); const rows = cs.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.company || '')}</td><td>${esc(x.profile?.summary || '')}</td><td>${esc(x.loyalty?.score ?? '')}</td></tr>`).join(''); const html = `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif} table{border-collapse:collapse} td,th{border:1px solid #ccc;padding:6px} </style></head><body><h1>客户清单</h1><table><tr><th>名称</th><th>公司</th><th>画像摘要</th><th>忠诚度</th></tr>${rows}</table></body></html>`; return new Response('\uFEFF' + html, { headers: { 'Content-Type': 'application/msword; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('客户清单.doc')}` } }); });
}
