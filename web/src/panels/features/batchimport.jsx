import React, { useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Btn, Select, Tag } from '../ui.jsx';

export default function BatchimportPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { text: 'Paste batch chats / CSV', sep: 'Separator', parse: 'Parse CSV', import: 'Import all', result: 'Result', errors: 'Errors' }
    : { text: '粘贴批量聊天记录 / CSV', sep: '分隔符', parse: '解析 CSV', import: '全部导入', result: '导入结果', errors: '错误' };
  const [mode, setMode] = useState('text'); const [sep, setSep] = useState(',');
  const [raw, setRaw] = useState(''); const [records, setRecords] = useState([]);
  const [result, setResult] = useState(null); const [busy, setBusy] = useState(false);
  const parse = async () => { const r = await api.post('/import/file', { csv: raw, separator: sep }); setRecords(r.records || []); };
  const doImport = async () => { setBusy(true); try { setResult(await api.post('/import/batch', { records })); setRecords([]); } finally { setBusy(false); } };
  const TXT_EXAMPLE = Z ? 'name,company,phone,text\\n陈总,华信贸易,13800138000,2024-06-12 09:00 陈总: 报价单看了……' : 'name,company,phone,text\n陈总,华信贸易,13800138000,2024-06-12 09:00 陈总: 报价单看了……';
  return (
    <>
      <Section title="Batch import" right={<div className="flex gap-1">{['text', 'csv'].map(m => <button key={m} onClick={() => setMode(m)} className={`px-2 py-1 text-[11px] rounded-lg ${mode === m ? 'bg-brand-soft text-brand' : 'text-fg-2 hover:bg-bg-3'}`}>{m === 'text' ? '批量聊天' : 'CSV'}</button>)}</div>}>
        <Card>
          <textarea rows={6} value={raw} onChange={e => setRaw(e.target.value)} placeholder={mode === 'csv' ? TXT_EXAMPLE : TXT.text} className="w-full rounded-lg border border-line-2 bg-bg px-2 py-1.5 text-xs font-mono outline-none focus:border-brand/60" />
          <div className="flex gap-1.5 mt-2 items-center">
            {mode === 'csv' && <Select value={sep} onChange={e => setSep(e.target.value)} className="w-24"><option value=",">Comma</option><option value="tab">Tab</option></Select>}
            {mode === 'csv' ? <Btn variant="primary" onClick={parse}>{TXT.parse}</Btn> : <Btn variant="primary" onClick={() => setRecords(raw.split(/\n{2,}/).filter(Boolean).map(text => ({ text })))}>{TXT.import}</Btn>}
            {records.length > 0 && <Btn onClick={doImport} disabled={busy}>{TXT.import}（{records.length}）</Btn>}
          </div>
        </Card>
        {records.length > 0 && <Section title={TXT.result}>{records.map((r, i) => <div key={i} className="text-xs text-fg-2 py-0.5">• {r.name || '自动识别'} {r.company ? '(' + r.company + ')' : ''} — {(r.text || '').slice(0, 40)}</div>)}</Section>}
        {result && (
          <Section title="Result"><Card className="text-xs space-y-1">
            导入 {result.imported.length} · {TXT.errors} {result.errors.length}
            <div className="flex flex-wrap gap-1">{result.imported.map(x => <Tag key={x.record_id}>{x.customer_name} ({x.messages})</Tag>)}</div>
            {result.errors.map((e, i) => <div key={i} className="text-danger">{e.name}: {e.error}</div>)}
          </Card></Section>
        )}
      </Section>
    </>
  );
}
