import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Empty } from '../ui.jsx';

const CCY = ['USD', 'EUR', 'JPY', 'GBP'];
export default function CurrencyPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { cfg: 'Rates', save: 'Save', conv: 'Converted', total: 'Total CNY' } : { cfg: '汇率配置', save: '保存', conv: '换算结果', total: '总成交(CNY)' };
  const [d, setD] = useState(null); const [rates, setRates] = useState({});
  useEffect(() => { api.get('/currency').then(d => { setD(d); setRates(d.rates || {}); }); }, []);
  const save = async () => { await api.post('/currency', { rates }); alert('已保存'); };
  if (!d) return <Empty text={t('loading')} />;
  const summary = null;
  return (
    <>
      <Section title={TXT.cfg} right={<Btn size="xs" onClick={save}><Save size={11} className="inline" /> {TXT.save}</Btn>}>
        <Card className="space-y-1.5">{CCY.map(ccy => <div key={ccy} className="flex items-center gap-2"><span className="w-12 text-xs text-fg-2">1{ccy} =</span><Input type="number" value={rates[ccy] || ''} onChange={e => setRates({ ...rates, [ccy]: +e.target.value })} placeholder="CNY" /><span className="text-[11px] text-fg-3">CNY</span></div>)}</Card>
      </Section>
      <CurrencySummary />
    </>
  );
}
function CurrencySummary() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/currency/summary').then(setS); }, []);
  if (!s) return null;
  return (
    <Section title="Summary">
      <Card className="space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-fg-2">总成交(CNY)</span><span className="font-semibold">¥{s.total_cny}</span></div>
        {Object.entries(s.converted).map(([ccy, v]) => <div key={ccy} className="flex justify-between text-xs"><span className="text-fg-2">{ccy}</span><span className="font-semibold tabular-nums">≈ {v}</span></div>)}
      </Card>
    </Section>
  );
}
