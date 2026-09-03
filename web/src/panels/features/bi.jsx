import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Btn, Input, Empty, Tag } from '../ui.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const EXAMPLES = ['上周成交多少', '哪些客户价格敏感', '成交额最高的客户是谁', '今日跟进任务', '哪些商品低库存', '流失风险高的客户'];
export default function BiPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { ask: 'Ask your data', q: 'Question', answer: 'Ask' } : { ask: 'Ask your data', q: '输入问题', answer: '提问' };
  const [q, setQ] = useState(''); const [r, setR] = useState(null); const [busy, setBusy] = useState(false);
  const run = async (question) => { const text = question || q; if (!text.trim()) return; setBusy(true); try { setR(await api.post('/bi/query', { question: text })); } finally { setBusy(false); } };
  const chart = r && (r.chart === 'line' || r.chart === 'bar') && Array.isArray(r.data) ? r.data : null;
  return (
    <>
      <Section title={TXT.ask} right={<div className="flex gap-1">{EXAMPLES.slice(0, 4).map(x => <button key={x} onClick={() => run(x)} className="px-2 py-1 text-[11px] rounded-lg bg-bg-3 text-fg-2 hover:text-fg">{x}</button>)}</div>}>
        <Card>
          <div className="flex gap-1.5"><Input placeholder={TXT.q} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} /><Btn variant="primary" disabled={busy} onClick={() => run()}><Send size={12} className="inline" /> {TXT.answer}</Btn></div>
        </Card>
        {r && (
          <Card className="mt-2">
            <div className="flex items-center gap-2 mb-1"><Tag color="indigo">{r.label}</Tag><span className="text-xs text-fg-3">{r.intent}</span></div>
            {r.narrative && <div className="text-sm text-fg mb-2">{r.narrative}</div>}
            {chart && <ResponsiveContainer width="100%" height={180}><BarChart data={chart} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey={chart[0].month ? 'month' : 'name'} tick={{ fontSize: 10, fill: 'var(--fg-2)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: 'var(--fg-3)' }} axisLine={false} tickLine={false} width={40} /><Tooltip contentStyle={{ background: 'var(--elev)', border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 12, color: 'var(--fg)' }} /><Bar dataKey={chart[0].amount ? 'amount' : 'score' || chart[0].stock ? 'stock' : Object.keys(chart[0])[1]} radius={[5, 5, 0, 0]} fill="var(--brand)" /></BarChart></ResponsiveContainer>}
            {!chart && Array.isArray(r.data) && <div className="text-xs text-fg-2 space-y-0.5">{r.data.map((x, i) => <div key={i}>• {typeof x === 'object' ? Object.entries(x).filter(([k]) => !k.includes('id')).map(([k, v]) => `${k}:${v}`).join(' · ') : x}</div>)}</div>}
          </Card>
        )}
        {!r && <Empty text={TXT.ask} />}
      </Section>
    </>
  );
}
