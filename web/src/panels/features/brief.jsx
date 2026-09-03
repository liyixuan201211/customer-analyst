import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Empty } from '../ui.jsx';

export default function BriefPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { today: 'Today follow-ups', overdue: 'Overdue', stock: 'Low stock', orders: 'New orders', orderAmt: 'Amount', risk: 'At risk', priorities: 'Top priorities' }
    : { today: '今日跟进', overdue: '逾期', stock: '低库存', orders: '新增成交', orderAmt: '金额', risk: '风险客户', priorities: '优先事项' };
  const [d, setD] = useState(null); const [busy, setBusy] = useState(false);
  const load = async () => { setBusy(true); try { setD(await api.get('/brief')); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  if (!d) return <Empty text={t('loading')} />;
  const f = d.facts;
  return (
    <>
      <Section title="Daily brief" right={<Btn onClick={load} disabled={busy}><RefreshCw size={12} className="inline" /> refresh</Btn>}>
        {d.narrative && <Card className="mb-2 text-[13px] text-fg leading-relaxed">{d.narrative}</Card>}
        {d.top_priorities?.length > 0 && <Card className="mb-2 text-xs space-y-1">{d.top_priorities.map((p, i) => <div key={i} className="flex gap-1.5"><span className="text-brand">{i + 1}.</span>{p}</div>)}</Card>}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Card><div className="text-[11px] text-fg-3">{TXT.orders}</div><div className="text-xl font-semibold">{f.orders_today}</div><div className="text-[11px] text-fg-3">¥{f.order_amount_today}</div></Card>
          <Card><div className="text-[11px] text-fg-3">{TXT.today}</div><div className="text-xl font-semibold">{f.today_followups.length}</div></Card>
        </div>
        <Section title={TXT.today}>{f.today_followups.length ? f.today_followups.map((x, i) => <div key={i} className="text-xs text-fg-2 py-0.5">• {x.customer} — {x.subject}</div>) : <div className="text-xs text-fg-3">{TXT.today}: 0</div>}</Section>
        <Section title={TXT.overdue}>{f.overdue.length ? f.overdue.map((x, i) => <div key={i} className="text-xs text-danger py-0.5">• {x.customer} — {x.subject}（{x.days}d）</div>) : <div className="text-xs text-fg-3">0</div>}</Section>
        <Section title={TXT.stock}>{f.low_stock.length ? f.low_stock.map((x, i) => <div key={i} className="text-xs text-warn py-0.5">• {x.name}（{x.stock}/{x.min}）</div>) : <div className="text-xs text-fg-3">0</div>}</Section>
        <Section title={TXT.risk}>{f.at_risk.length ? f.at_risk.map((x, i) => <div key={i} className="text-xs text-danger py-0.5">• {x.name}（{x.segment}，{x.recency_days}d）</div>) : <div className="text-xs text-fg-3">0</div>}</Section>
      </Section>
    </>
  );
}
