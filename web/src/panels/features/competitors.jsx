import React, { useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Empty } from '../ui.jsx';

export default function CompetitorsPanel() {
  const { t, locale } = useI18n();
  const Z = locale === 'en-US';
  const TXT = Z ? { add: 'Add competitor price', product: 'Product', comp: 'Competitor', price: 'Price', features: 'Features / notes', url: 'URL', compare: 'Benchmark', our: 'Our price', gap: 'Gap', search: 'Filter by product', empty: 'No records', advW: 'Price advantage', advH: 'Price higher' }
    : { add: '新增竞品价', product: '商品', comp: '竞品', price: '价格', features: '特性/备注', url: 'URL', compare: '对标', our: '我方价', gap: '价差', search: '按商品筛选', empty: '暂无记录', advW: '价格占优', advH: '价格偏高' };
  const [list, setList] = useState([]);
  const [cmp, setCmp] = useState(null);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ product_name: '', competitor: '', price: '', feature_notes: '', url: '' });
  const [showForm, setShowForm] = useState(false);
  const load = () => api.get('/competitors' + (q ? '?product_name=' + encodeURIComponent(q) : '')).then(setList);
  useEffect(() => { load(); }, [q]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = async () => { if (!f.product_name || !f.competitor) return; await api.post('/competitors', { ...f, price: +f.price || null }); setF({ product_name: '', competitor: '', price: '', feature_notes: '', url: '' }); setShowForm(false); load(); };
  const compare = async () => { if (!q.trim()) return; setCmp(await api.get('/competitors/compare?product_name=' + encodeURIComponent(q))); };
  return (
    <>
      <Section title={TXT.compare} right={<input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && compare()} placeholder={TXT.search} className="w-40 rounded-lg border border-line-2 bg-bg px-2 py-1 text-xs outline-none focus:border-brand/60" />}>
        <div className="flex gap-1.5"><Btn variant="primary" onClick={compare}>{TXT.compare}</Btn><Btn onClick={() => setShowForm(!showForm)}><Plus size={12} className="inline" /> {TXT.add}</Btn></div>
        {showForm && (
          <Card className="mt-2 fade-in"><div className="grid grid-cols-2 gap-1.5">
            <Input placeholder={TXT.product} value={f.product_name} onChange={set('product_name')} /><Input placeholder={TXT.comp} value={f.competitor} onChange={set('competitor')} />
            <Input type="number" placeholder={TXT.price} value={f.price} onChange={set('price')} /><Input placeholder={TXT.url} value={f.url} onChange={set('url')} />
            <Input placeholder={TXT.features} value={f.feature_notes} onChange={set('feature_notes')} className="col-span-2" />
          </div><div className="flex gap-1.5 mt-2"><Btn variant="primary" onClick={create}>{TXT.add}</Btn><Btn onClick={() => setShowForm(false)}>{t('cancel')}</Btn></div></Card>
        )}
        {cmp && (
          <Card className="mt-2">
            <div className="text-sm font-semibold mb-1">{cmp.product} · {TXT.our} ¥{cmp.ourPrice}</div>
            {cmp.items.map(i => <div key={i.id} className="flex items-center gap-2 py-1 border-t border-line text-xs"><span className="w-24 text-fg-2">{i.competitor}</span><span className="flex-1 h-2 bg-bg-3 rounded-full overflow-hidden"><div className="h-full bg-brand" style={{ width: Math.min(100, ((i.price || 0) / (cmp.ourPrice * 1.5 || 1)) * 100) + '%' }} /></span><span className="w-16 text-right tabular-nums">¥{i.price}</span><span className={`w-20 text-right ${i.advantage === '价格占优' || Z ? 'text-ok' : 'text-danger'}`}>{i.advantage === '价格占优' ? TXT.advW : i.advantage === '价格偏高' ? TXT.advH : ''}{i.gapPercent != null ? ` ${i.gapPercent}%` : ''}</span></div>)}
          </Card>
        )}
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(i => (
          <Card key={i.id} className="mb-1.5 mt-2"><div className="flex items-center gap-2"><Tag color="indigo">{i.competitor}</Tag><span className="text-sm flex-1 truncate">{i.product_name}</span><span className="text-sm font-semibold tabular-nums">¥{i.price ?? '—'}</span><Btn size="xs" variant="danger" onClick={async () => { await api.del(`/competitors/${i.id}`); load(); }}><Trash2 size={11} /></Btn></div>{i.feature_notes && <div className="text-xs text-fg-2 mt-1 pl-2">{i.feature_notes}</div>}</Card>
        ))}
      </Section>
    </>
  );
}
