import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Empty, Score } from '../ui.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function LtvPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { avg: 'Avg LTV', high: 'High', totalLtv: 'Total LTV', tier: 'Tier' } : { avg: '平均LTV', high: '高价值', totalLtv: '总LTV', tier: '层级' };
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/ltv').then(setD); }, []);
  if (!d) return <Empty text={t('loading')} />;
  const top = d.list.slice(0, 8).map(x => ({ name: x.name.slice(0, 6), ltv: x.ltv }));
  return (
    <>
      <Section title={`LTV · ${d.list.length}`} right={<div className="flex gap-2 text-[11px] text-fg-3"><span>{TXT.totalLtv}: ¥{d.summary.total_ltv}</span><span>{TXT.avg}: ¥{d.summary.avg}</span><span>{TXT.high}: {d.summary.high}</span></div>}>
        {top.length > 0 && <Card className="mb-2"><ResponsiveContainer width="100%" height={180}><BarChart data={top} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--fg-2)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: 'var(--fg-3)' }} axisLine={false} tickLine={false} width={44} /><Tooltip formatter={v => [`¥${v}`, 'LTV']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 12, color: 'var(--fg)' }} /><Bar dataKey="ltv" radius={[5, 5, 0, 0]} fill="var(--brand)" /></BarChart></ResponsiveContainer></Card>}
        <div className="space-y-1.5">{d.list.map(x => (
          <Card key={x.id} className="flex items-center gap-2"><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{x.name}</div><div className="text-[11px] text-fg-3">{x.avg_order ? `客单¥${x.avg_order}` : '未成交'}</div></div><Tag color={x.tier === '高价值' ? 'green' : 'amber'}>{TXT.tier}·{x.tier}</Tag><span className="text-sm font-semibold tabular-nums">¥{x.ltv}</span></Card>
        ))}</div>
      </Section>
    </>
  );
}
