import React, { useEffect, useState } from 'react';
import { Download, CalendarCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { useStore } from '../store/index.js';
import { useI18n } from '../i18n.js';
import { SegmentDonut, ScoreBars } from '../components/charts.jsx';
import { Section, Card, Empty, Tag, levelColor } from './ui.jsx';

export default function HomePanel() {
  const [d, setD] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [rfm, setRfm] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loyaltyDist, setLoyaltyDist] = useState([]);
  const [pendingFu, setPendingFu] = useState(0);
  const showPanel = useStore((s) => s.showPanel);
  const { t, locale } = useI18n();
  useEffect(() => {
    api.get('/dashboard').then(setD);
    api.get('/customers').then((c) => { setCustomers(c.slice(0, 8)); setLoyaltyDist(c.filter(x => x.loyalty).map(x => ({ name: x.name.slice(0, 6), score: x.loyalty.score }))); });
    api.get('/rfm').then((r) => { setRfm(r); const m = {}; r.forEach(x => { m[x.segment] = (m[x.segment] || 0) + 1; }); setSegments(Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)); });
    api.get('/followups?status=pending').then((f) => setPendingFu(f.length));
  }, []);
  if (!d) return <Empty text={t('loading')} />;
  const stat = (label, v) => <Card><div className="text-[11px] text-fg-3">{label}</div><div className="text-xl font-semibold tabular-nums">{v ?? '-'}</div></Card>;
  return (
    <>
      <Section title={t('h_biz')} right={
        <div className="flex gap-1">
          <a href={`/api/report.csv?locale=${encodeURIComponent(locale)}`} className="rounded-md bg-elev border border-line-2 hover:bg-bg-3 px-2 py-1 text-[11px] flex items-center gap-1"><Download size={11} /> {t('h_export_all')}</a>
          <button onClick={() => showPanel({ view: 'followups', tab: 'today' })} className="rounded-md bg-elev border border-line-2 hover:bg-bg-3 px-2 py-1 text-[11px] flex items-center gap-1"><CalendarCheck size={11} /> {t('fu_title')} {pendingFu ? `(${pendingFu})` : ''}</button>
        </div>
      }>
        <div className="grid grid-cols-2 gap-2">
          {stat(t('h_customers'), d.customers)}
          {stat(t('h_loyalty_avg'), d.avg_loyalty)}
          {stat(t('h_sku'), d.products)}
          {stat(t('h_invvalue'), '¥' + (d.inventory_value || 0).toLocaleString())}
          {stat(t('h_staff'), d.staff)}
          {stat(t('h_kbdocs'), d.kb_docs)}
        </div>
      </Section>

      {segments.length > 0 && (
        <Section title={t('rfm_overview')}>
          <Card><SegmentDonut data={segments} /></Card>
        </Section>
      )}

      {loyaltyDist.length > 0 && (
        <Section title={t('fu_title') + ' / ' + t('p_preview')}>
          <Card><ScoreBars data={loyaltyDist} /></Card>
        </Section>
      )}

      <Section title={t('h_recent')}>
        {customers.length === 0 ? <Empty text={t('no_chat')} /> : (
          <div className="space-y-1.5">
            {customers.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:border-fg-3" onClick={() => showPanel({ view: 'customer', customer_id: c.id })}>
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium">{c.name}</div><div className="text-[11px] text-fg-3">{c.company || c.profile?.summary?.slice(0, 40) || '—'}</div></div>
                  <div className="flex flex-col items-end gap-1">
                    {c.loyalty ? <Tag color={levelColor(c.loyalty.level)}>{c.loyalty.score} · {c.loyalty.level}</Tag> : <Tag>{t('h_not_analyzed')}</Tag>}
                    {rfm.find((x) => x.id === c.id) && <Tag color="indigo">{rfm.find((x) => x.id === c.id).segment}</Tag>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('h_guide')}>
        <Card className="text-xs text-fg-2 space-y-1 leading-relaxed">
          <div>{t('h_g1')}</div><div>{t('h_g2')}</div><div>{t('h_g3')}</div><div>{t('h_g4')}</div><div>{t('h_g5')}</div>
        </Card>
      </Section>
    </>
  );
}
