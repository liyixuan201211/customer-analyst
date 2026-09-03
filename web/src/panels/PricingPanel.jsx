import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n.js';
import { api } from '../lib/api.js';
import { useStore } from '../store/index.js';
import { Section, Card, Tag, Btn, Input, Select, Empty, List, KV } from './ui.jsx';
import { PriceBars } from '../components/charts.jsx';

/** 定价结果展示 + 手动计算 */
export default function PricingPanel({ pricing: init, customerId, applied, productId }) {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState({ product_id: init?.product_id || productId || '', customer_id: customerId || '', demand: 1, competitor_price: '', season: 1 });
  const [r, setR] = useState(init || null);
  const [busy, setBusy] = useState(false);
  const savedMsg = t('p_suggested');
  const [msg, setMsg] = useState(applied ? savedMsg : '');
  useEffect(() => { api.get('/products').then(setProducts); api.get('/customers').then(setCustomers); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const calc = async (apply) => {
    if (!f.product_id) return;
    setBusy(true); setMsg('');
    try {
      const body = { customer_id: f.customer_id || undefined, demand: +f.demand, season: +f.season, apply };
      if (f.competitor_price) body.competitor_price = +f.competitor_price;
      const res = await api.post(`/products/${f.product_id}/pricing`, body);
      setR(res); if (apply) setMsg(t('p_applied') + ' ¥' + res.suggested_price);
    } catch (e) { setMsg(t('err') + '：' + e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <Section title={t('p_calc')}>
        <Card className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><div className="text-[11px] text-fg-3 mb-0.5">商品</div><Select value={f.product_id} onChange={set('product_id')}><option value="">{t('p_product')}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ¥{p.current_price}</option>)}</Select></div>
            <div><div className="text-[11px] text-fg-3 mb-0.5">目标客户（可选）</div><Select value={f.customer_id} onChange={set('customer_id')}><option value="">{t('p_general')}</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.loyalty ? ` (${c.loyalty.score})` : ''}</option>)}</Select></div>
            <div><div className="text-[11px] text-fg-3 mb-0.5">{t('p_demand')}</div><Input type="number" step="0.1" min="0" max="2" value={f.demand} onChange={set('demand')} /></div>
            <div><div className="text-[11px] text-fg-3 mb-0.5">{t('p_competitor')}</div><Input type="number" placeholder="可选" value={f.competitor_price} onChange={set('competitor_price')} /></div>
            <div><div className="text-[11px] text-fg-3 mb-0.5">{t('p_season')}</div><Input type="number" step="0.05" min="0.5" max="1.5" value={f.season} onChange={set('season')} /></div>
          </div>
          <div className="flex gap-1.5 items-center"><Btn variant="primary" disabled={busy || !f.product_id} onClick={() => calc(false)}>{t('p_calc_btn')}</Btn><Btn disabled={busy || !r} onClick={() => calc(true)}>{t('p_apply')}</Btn><span className="text-[11px] text-fg-3">{msg}</span></div>
        </Card>
      </Section>
      {r && <PricingResult r={r} />}
    </>
  );
}

export function PricingResult({ r }) {
  const { t } = useI18n();
  const d = r.distribution || {};
  return (
    <>
      <Card className="mb-3">
        <div className="flex items-baseline justify-between"><div className="text-sm font-semibold">{r.product}</div><div className="text-[11px] text-fg-3">{t('p_current')} ¥{r.current_price} · {t('p_base')} ¥{r.base_price} · {t('p_cost')} ¥{r.cost}</div></div>
        <div className="mt-2 flex items-end gap-3">
          <div><div className="text-[11px] text-fg-3">{t('p_suggested')}</div><div className="text-3xl font-bold tabular-nums text-brand">¥{r.suggested_price}</div></div>
          <Tag color={r.total_adjustment >= 0 ? 'green' : 'red'}>{r.total_adjustment >= 0 ? '+' : ''}{r.total_adjustment}%</Tag>
          {d.margin != null && <Tag color={d.margin >= 20 ? 'green' : d.margin >= 10 ? 'amber' : 'red'}>{t('p_margin')} {d.margin}%</Tag>}
        </div>
      </Card>
      <Section title={t('p_dist')}>
        <Card><PriceBars distribution={d} /></Card>
      </Section>
      <Section title={t('p_factors')}>
        <Card className="space-y-1">{r.factors?.map((x) => <div key={x.name} className="flex items-center justify-between text-xs"><span className="text-fg-2">{x.name} <span className="text-fg-3">({String(x.value)})</span></span><span className={`tabular-nums font-medium ${x.adj > 0 ? 'text-ok' : x.adj < 0 ? 'text-danger' : 'text-fg-3'}`}>{x.adj > 0 ? '+' : ''}{(x.adj * 100).toFixed(1)}%</span></div>)}</Card>
      </Section>
      <Section title={t('p_tiers')}>
        <Card className="space-y-1">{r.tiers?.map((t) => <div key={t.tier} className="flex justify-between text-xs"><span className="text-fg-2">{t.tier}</span><span className="tabular-nums font-medium">¥{t.price}</span></div>)}</Card>
      </Section>
      {r.explanation && (r.explanation.rationale || r.explanation.tactics) && (
        <Section title={t('p_agent')}>
          <Card className="space-y-2">
            {r.explanation.rationale && <div className="text-xs text-fg">{r.explanation.rationale}</div>}
            {r.explanation.risks?.length > 0 && <div><div className="text-[11px] text-danger mb-0.5">{t('p_risks')}</div><List items={r.explanation.risks} icon="⚠" /></div>}
            {r.explanation.tactics?.length > 0 && <div><div className="text-[11px] text-ok mb-0.5">{t('p_tactics')}</div><List items={r.explanation.tactics} icon="→" /></div>}
          </Card>
        </Section>
      )}
    </>
  );
}
