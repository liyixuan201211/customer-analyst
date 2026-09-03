import React, { useEffect, useState } from 'react';
import { Maximize2, RefreshCw, X } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Empty } from '../ui.jsx';
import { SegmentDonut, ScoreBars } from '../../components/charts.jsx';

export default function BigscreenPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { enter: 'Enter fullscreen', exit: 'Exit', auto: 'Auto-refresh', n: 'Data' }
    : { enter: '进入全屏', exit: '退出全屏', auto: '自动刷新', n: '数据' };
  const [d, setD] = useState(null); const [fs, setFs] = useState(false);
  const load = () => api.get('/dashboard/v2').then(setD);
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, []);
  const toggleFs = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); setFs(!fs); };
  if (!d) return <Empty text={t('loading')} />;
  const revenue = (d.revenueByMonth || []).slice(-6);
  return (
    <>
      <Section title="Big screen" right={<div className="flex gap-1.5"><button onClick={toggleFs} className="rounded-md bg-elev border border-line-2 hover:bg-bg-3 px-2 py-1 text-xs flex items-center gap-1"><Maximize2 size={12} className="inline" /> {fs ? TXT.exit : TXT.enter}</button><button onClick={load} className="rounded-md bg-elev border border-line-2 hover:bg-bg-3 px-2 py-1 text-xs flex items-center gap-1"><RefreshCw size={12} className="inline" /> {TXT.auto} 30s</button></div>}>
        {fs && <Card className="mb-2 text-[12px] text-fg-2 flex items-center gap-2"><X size={13} /> 按 Esc 或右上按钮退出全屏</Card>}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[['客户', d.customers], ['成交额', '¥' + d.orders_total], ['跟进完成', d.followup_completion + '%'], ['低库存', d.low_stock.length]].map(([k, v]) => <Card key={k} className="text-center"><div className="text-2xl font-bold tabular-nums text-brand">{v}</div><div className="text-[11px] text-fg-3">{k}</div></Card>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {d.segments?.length > 0 && <Card><div className="text-[11px] text-fg-3 mb-1">客户分层</div><SegmentDonut data={d.segments} /></Card>}
          <div className="space-y-3">
            {d.top_customers?.length > 0 && <Card><div className="text-[11px] text-fg-3 mb-1">重点客户</div><div className="space-y-1">{d.top_customers.slice(0, 5).map((c, i) => <div key={i} className="flex justify-between text-sm"><span className="truncate">{c.name}</span><span className="tabular-nums">¥{c.amount}</span></div>)}</div></Card>}
            {d.low_stock?.length > 0 && <Card><div className="text-[11px] text-fg-3 mb-1">低库存</div>{d.low_stock.slice(0, 4).map((p, i) => <div key={i} className="text-xs text-warn">• {p.name}（{p.stock}/{p.min_stock}）</div>)}</Card>}
          </div>
        </div>
      </Section>
    </>
  );
}
