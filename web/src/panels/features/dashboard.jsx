import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Empty } from '../ui.jsx';
import { SegmentDonut, ScoreBars } from '../../components/charts.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function DashboardPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { funnel: 'Sales funnel', revenue: 'Revenue', segments: 'Segments', stock: 'Low stock', fu: 'Follow-up rate', topC: 'Top customers' }
    : { funnel: '销售漏斗', revenue: '成交趋势', segments: '客户分层', stock: '低库存', fu: '跟进完成率', topC: '重点客户' };
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/dashboard/v2').then(setD); }, []);
  if (!d) return <Empty text={t('loading')} />;
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card><div className="text-[11px] text-fg-3">{Z ? 'Revenue' : '总成交额'}</div><div className="text-lg font-semibold tabular-nums">¥{d.orders_total}</div><div className="text-[10px] text-fg-3">{d.orders_count} orders</div></Card>
        <Card><div className="text-[11px] text-fg-3">{TXT.fu}</div><div className="text-lg font-semibold tabular-nums">{d.followup_completion}%</div></Card>
        <Card><div className="text-[11px] text-fg-3">{Z ? 'Customers' : '客户'}</div><div className="text-lg font-semibold tabular-nums">{d.customers}</div><div className="text-[10px] text-fg-3">{d.profiled} profiled</div></Card>
      </div>
      {d.funnel.length > 0 && <Section title={TXT.funnel}><Card className="space-y-1">{d.funnel.map((s, i) => <div key={s.name} className="flex items-center gap-2 text-xs"><span className="w-12 text-fg-2">{s.name}</span><div className="flex-1 h-5 bg-bg-3 rounded overflow-hidden"><div className="h-full bg-brand/70" style={{ width: Math.max(8, (s.value / d.funnel[0].value) * 100) + '%' }} /></div><span className="w-8 text-right tabular-nums">{s.value}</span></div>)}</Card></Section>}
      {d.revenueByMonth.length > 0 && <Section title={TXT.revenue}><Card><ResponsiveContainer width="100%" height={180}><BarChart data={d.revenueByMonth} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--fg-2)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: 'var(--fg-3)' }} axisLine={false} tickLine={false} width={40} /><Tooltip formatter={v => [`¥${v}`, 'Amount']} contentStyle={{ background: 'var(--elev)', border: '1px solid var(--border-2)', borderRadius: 10, fontSize: 12, color: 'var(--fg)' }} /><Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="var(--brand)" /></BarChart></ResponsiveContainer></Card></Section>}
      {d.segments.length > 0 && <Section title={TXT.segments}><Card><SegmentDonut data={d.segments} /></Card></Section>}
      {d.top_customers.length > 0 && <Section title={TXT.topC}><Card className="space-y-1">{d.top_customers.map((c, i) => <div key={i} className="flex items-center gap-2 text-xs"><span className="w-24 truncate text-fg-2">{c.name}</span><div className="flex-1 h-2 bg-bg-3 rounded-full overflow-hidden"><div className="h-full bg-ok" style={{ width: Math.min(100, (c.amount / (d.top_customers[0].amount || 1)) * 100) + '%' }} /></div><span className="w-16 text-right tabular-nums">¥{c.amount}</span></div>)}</Card></Section>}
      {d.low_stock.length > 0 && <Section title={TXT.stock}><Card className="text-xs space-y-0.5">{d.low_stock.map((p, i) => <div key={i} className="text-warn">• {p.name}（{p.stock}/{p.min_stock}）</div>)}</Card></Section>}
    </>
  );
}
