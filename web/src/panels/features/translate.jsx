import React, { useEffect, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Btn, Input, Select, Textarea, Empty, Tag } from '../ui.jsx';

export default function TranslatePanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { gen: 'Generate', type: 'Type', lang: 'Language', subject: 'Subject', body: 'Body', copy: 'Copy', cust: 'Customer (optional)', orText: 'Or paste text to translate', genBtn: 'Generate' }
    : { gen: '生成', type: '类型', lang: '语言', subject: '主题', body: '正文', copy: '复制', cust: '客户（可选）', orText: '或粘贴文本直接翻译', genBtn: '生成' };
  const [custs, setCusts] = useState([]); const [langs, setLangs] = useState([]);
  const [f, setF] = useState({ customer_id: '', type: 'email', language: 'en', text: '' });
  const [data, setData] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/customers').then(setCusts); api.get('/translate/langs').then(setLangs); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const gen = async () => { if (!f.customer_id && !f.text.trim()) return; setBusy(true); try { setData(await api.post('/translate', f)); } finally { setBusy(false); } };
  return (
    <>
      <Section title={TXT.gen} right={<div className="text-[11px] text-fg-3">{langs.length}+ {TXT.lang}</div>}>
        <Card><div className="grid grid-cols-2 gap-1.5">
          <Select value={f.type} onChange={set('type')}><option value="email">Email</option><option value="whatsapp">WhatsApp</option></Select>
          <Select value={f.language} onChange={set('language')}>{langs.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</Select>
          <Select value={f.customer_id} onChange={set('customer_id')} className="col-span-2"><option value="">{TXT.cust}</option>{custs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Textarea rows={2} placeholder={TXT.orText} value={f.text} onChange={set('text')} className="col-span-2" />
          <Btn variant="primary" className="col-span-2" onClick={gen} disabled={busy || (!f.customer_id && !f.text.trim())}><RefreshCw size={12} className="inline" /> {TXT.genBtn}</Btn>
        </div></Card>
        {data && (
          <Card className="mt-2 space-y-2">
            {data.subject && <div><div className="text-[11px] text-fg-3">{TXT.subject}</div><div className="text-[13px] font-medium">{data.subject}</div></div>}
            {data.body && <><div className="text-[11px] text-fg-3">{TXT.body}</div><pre className="text-[12.5px] whitespace-pre-wrap bg-bg-2 rounded-lg p-2 max-h-64 overflow-y-auto">{data.body}</pre></>}
            <Btn size="xs" onClick={() => navigator.clipboard.writeText(data.body || data.subject)}><Copy size={11} className="inline" /> {TXT.copy}</Btn>
            <div className="flex gap-1"><Tag color="blue">{data.language}</Tag>{data.type && <Tag>{data.type}</Tag>}</div>
          </Card>
        )}
        {!data && <Empty text={locale === 'en-US' ? 'Select a customer or paste text, then generate' : '选择客户或粘贴文本后生成'} />}
      </Section>
    </>
  );
}
