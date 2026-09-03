// 批量建档：多段聊天文本/CSV 一键导入，自动识别客户、去重合并、建档
import { customers, chatRecords } from '../db/index.js';
import { parseChatText, toTranscript, guessCustomerName } from '../tools/importer.js';
import { activity } from '../auth.js';

export default function register(api, ctx) {
  api.post('/import/batch', async (c) => {
    const { records } = await c.req.json(); // [{name?, company?, phone?, text}]
    if (!Array.isArray(records) || !records.length) return c.json({ error: '无数据' }, 400);
    const out = { imported: [], skipped: [], errors: [] };
    for (const rec of records) {
      try {
        const text = (rec.text || '').trim();
        if (!text) continue;
        const parsed = parseChatText(text);
        let cu = rec.name ? customers.findByName(rec.name) : null;
        if (!cu) { const guess = await guessCustomerName(toTranscript(parsed)); cu = customers.findByName(guess) || customers.create({ name: rec.name || guess, company: rec.company, phone: rec.phone, owner_id: ctx.me(c)?.id }); }
        else if (rec.company && !cu.company) cu = customers.update(cu.id, { company: rec.company });
        const id = chatRecords.add({ customer_id: cu.id, source: 'batch', file_name: rec.file_name, content: toTranscript(parsed), parsed, owner_id: ctx.me(c)?.id });
        out.imported.push({ customer_id: cu.id, customer_name: cu.name, record_id: id, messages: parsed.length });
      } catch (e) { out.errors.push({ name: rec.name || '?', error: e.message }); }
    }
    activity.log(ctx.me(c), 'import', 'customer', null, `批量导入 ${out.imported.length} 条`);
    return c.json(out);
  });
  // CSV 文本导入：首行表头 name,company,phone,text → 返回解析后的 records（随后 POST /import/batch）
  api.post('/import/file', async (c) => {
    const { csv, separator = ',' } = await c.req.json();
    if (!csv) return c.json({ error: '缺少 csv' }, 400);
    const sep = separator === 'tab' ? '\t' : separator;
    const rows = csv.split(/\r?\n/).filter(r => r.trim());
    if (rows.length < 2) return c.json({ error: 'CSV 无数据行' }, 400);
    const head = rows[0].split(sep).map(h => h.trim());
    const records = rows.slice(1).map(r => { const cels = r.split(sep); const o = {}; head.forEach((h, i) => o[h] = (cels[i] || '').trim()); return o; });
    const rec = records.map(r => ({ name: r.name || r['客户名称'] || r['名称'], company: r.company || r['公司'], phone: r.phone || r['电话'], text: r.text || r['聊天内容'] || r['聊天记录'] || '' })).filter(r => r.text);
    return c.json({ rows: rec.length, records: rec });
  });
  // 补充：把解析后的记录直接交付（上面已返回 records）
  api.get('/import/sample', (c) => c.json({ headers: ['name', 'company', 'phone', 'text'], sample: 'name,company,phone,text\n陈总,华信贸易,13800138000,2024-06-12 09:00 陈总: 你们的报价单我看了……' }));
}
