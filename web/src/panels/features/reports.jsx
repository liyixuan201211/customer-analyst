import React, { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Select, Empty } from '../ui.jsx';

export default function ReportsPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { gen: 'Generate', kind: 'Kind', weekly: 'Weekly', monthly: 'Monthly', recent: 'Recent reports', empty: 'No reports' }
    : { gen: '生成报告', kind: '类型', weekly: '周报', monthly: '月报', recent: '最近报告', empty: '暂无报告' };
  const [d, setD] = useState(null); const [kind, setKind] = useState('weekly'); const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState(null);
  useEffect(() => { api.get('/reports').then(setD); }, []);
  const gen = async () => { setBusy(true); try { setCur(await api.post('/reports/generate', { kind })); api.get('/reports').then(setD); } finally { setBusy(false); } };
  if (!d) return <Empty text={t('loading')} />;
  return (
    <>
      <Section title={TXT.gen} right={<div className="flex gap-1"><Select value={kind} onChange={e => setKind(e.target.value)} className="w-24"><option value="weekly">{TXT.weekly}</option><option value="monthly">{TXT.monthly}</option></Select><Btn variant="primary" onClick={gen} disabled={busy}><FileText size={12} className="inline" /> {TXT.gen}</Btn></div>}>
        {cur && (
          <Card className="mb-2">
            <div className="flex items-center gap-2 mb-1"><Tag color="indigo">{cur.kind === 'monthly' ? TXT.monthly : TXT.weekly}</Tag><span className="text-[11px] text-fg-3">{new Date(cur.generated_at).toLocaleString('zh-CN')}</span><a href="/api/reports/export" className="ml-auto text-[11px] text-brand"><Download size={11} className="inline" /> CSV</a></div>
            {cur.narrative && <div className="text-[13px] text-fg leading-relaxed">{cur.narrative}</div>}
            {cur.insights?.length > 0 && <div className="mt-1.5 space-y-0.5">{cur.insights.map((x, i) => <div key={i} className="text-xs text-fg-2">• {x}</div>)}</div>}
          </Card>
        )}
      </Section>
      <Section title={TXT.recent}>
        {(d.recent || []).length === 0 ? <Empty text={TXT.empty} /> : d.recent.map(r => <Card key={r.id} className="mb-1.5 flex items-center gap-2"><Tag color="blue">{r.kind === 'monthly' ? '月' : '周'}</Tag><span className="text-sm flex-1 truncate">生成于 {new Date(r.generated_at).toLocaleString('zh-CN')}</span><a href="/api/reports/export" className="text-[11px] text-brand"><Download size={11} className="inline" /> CSV</a></Card>)}
      </Section>
    </>
  );
}
