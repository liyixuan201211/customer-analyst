import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n.js';
import { Trash2, Plus, TrendingUp, PackagePlus, PackageMinus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useStore } from '../store/index.js';
import { Section, Card, Tag, Btn, Input, Empty } from './ui.jsx';

const BLANK = { sku: '', name: '', category: '', cost: '', base_price: '', stock: '', min_stock: '', unit: '件' };

export default function InventoryPanel() {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [f, setF] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState('');
  const [hist, setHist] = useState(null);
  const { showPanel, send, streaming } = useStore();
  const load = () => api.get('/products' + (q ? `?q=${encodeURIComponent(q)}` : '')).then(setList);
  useEffect(() => { load(); }, [q]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const body = { ...f, cost: +f.cost || 0, base_price: +f.base_price || 0, stock: +f.stock || 0, min_stock: +f.min_stock || 0 };
    if (editId) await api.patch(`/products/${editId}`, body); else await api.post('/products', { ...body, current_price: body.base_price });
    setF(BLANK); setEditId(null); load();
  };
  const move = async (p, sign) => {
    const n = prompt(`${sign > 0 ? t('inv_in') : t('inv_out')}数量（${p.name}，当前 ${p.stock}）`); if (!n) return;
    const reason = prompt('原因（可选）') || '';
    await api.post(`/products/${p.id}/stock`, { delta: sign * Math.abs(+n), reason, operator: '手动' }); load();
  };
  const low = list.filter((p) => p.min_stock > 0 && p.stock < p.min_stock);
  return (
    <>
      {low.length > 0 && <Card className="mb-3 border-warn/30 bg-warn/10"><div className="text-xs text-warn">⚠ {t('inv_low_alert')}：{low.map((p) => `${p.name}(${p.stock}/${p.min_stock})`).join('、')}</div></Card>}
      <Section title={editId ? t('inv_edit') : t('inv_new')}>
        <Card>
          <div className="grid grid-cols-2 gap-1.5">
            <Input placeholder={t('inv_name')} value={f.name} onChange={set('name')} /><Input placeholder={t('inv_sku')} value={f.sku} onChange={set('sku')} />
            <Input placeholder={t('inv_cat')} value={f.category} onChange={set('category')} /><Input placeholder={t('inv_unit')} value={f.unit} onChange={set('unit')} />
            <Input type="number" placeholder={t('inv_cost')} value={f.cost} onChange={set('cost')} /><Input type="number" placeholder={t('inv_base')} value={f.base_price} onChange={set('base_price')} />
            <Input type="number" placeholder={t('inv_stock')} value={f.stock} onChange={set('stock')} /><Input type="number" placeholder={t('inv_min')} value={f.min_stock} onChange={set('min_stock')} />
          </div>
          <div className="flex gap-1.5 mt-2"><Btn variant="primary" disabled={!f.name.trim()} onClick={save}><Plus size={12} className="inline" /> {editId ? '保存' : '新增'}</Btn>{editId && <Btn onClick={() => { setF(BLANK); setEditId(null); }}>{t('inv_cancel')}</Btn>}<Btn variant="ghost" disabled={streaming} onClick={() => send('生成库存健康报告，指出需要补货和积压的商品，并给出周转建议。')}>{t('inv_report')}</Btn></div>
        </Card>
      </Section>
      <Section title={`商品列表 (${list.length})`} right={<Input placeholder={t('inv_search')} value={q} onChange={(e) => setQ(e.target.value)} className="w-28" />}>
        {list.length === 0 ? <Empty text={t('inv_none')} /> : list.map((p) => (
          <Card key={p.id} className="mb-1.5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{p.name} {p.sku && <span className="text-[11px] text-fg-3">{p.sku}</span>}</div>
                <div className="text-[11px] text-fg-3">{p.category || '—'} · 成本 ¥{p.cost} · 基准 ¥{p.base_price}</div>
              </div>
              <div className="text-right shrink-0"><div className="text-sm font-semibold tabular-nums">¥{p.current_price}</div><Tag color={p.min_stock > 0 && p.stock < p.min_stock ? 'red' : p.min_stock > 0 && p.stock > p.min_stock * 4 ? 'amber' : 'green'}>库存 {p.stock}{p.unit}</Tag></div>
            </div>
            <div className="flex gap-1 mt-2">
              <Btn size="xs" onClick={() => showPanel({ view: 'pricing', pricing: null, product_id: p.id })} title={t('inv_price')}><TrendingUp size={11} className="inline" /> {t('inv_price')}</Btn>
              <Btn size="xs" onClick={() => move(p, 1)}><PackagePlus size={11} className="inline" /> {t('inv_in')}</Btn>
              <Btn size="xs" onClick={() => move(p, -1)}><PackageMinus size={11} className="inline" /> {t('inv_out')}</Btn>
              <Btn size="xs" onClick={async () => setHist({ p, ...(await api.get(`/products/${p.id}/history`)) })}>{t('inv_hist')}</Btn>
              <Btn size="xs" onClick={() => { setEditId(p.id); setF({ sku: p.sku || '', name: p.name, category: p.category || '', cost: p.cost, base_price: p.base_price, stock: p.stock, min_stock: p.min_stock, unit: p.unit }); }}>{t('edit')}</Btn>
              <Btn size="xs" variant="danger" onClick={async () => { if (confirm('删除商品？')) { await api.del(`/products/${p.id}`); load(); } }}><Trash2 size={11} /></Btn>
            </div>
            {hist?.p.id === p.id && (
              <div className="mt-2 text-[11px] text-fg-2 space-y-0.5 border-t border-line pt-2">
                <div className="font-medium">{t('inv_prices')}</div>{hist.prices.length ? hist.prices.map((h) => <div key={h.id}>{new Date(h.created_at).toLocaleString('zh-CN')} ¥{h.old_price} → ¥{h.new_price} {h.reason}</div>) : <div className="text-fg-3">{t('inv_none_hist')}</div>}
                <div className="font-medium mt-1">{t('inv_flows')}</div>{hist.stock.length ? hist.stock.map((h) => <div key={h.id}>{new Date(h.created_at).toLocaleString('zh-CN')} {h.delta > 0 ? '+' : ''}{h.delta} {h.reason} {h.operator}</div>) : <div className="text-fg-3">{t('inv_none_hist')}</div>}
              </div>
            )}
          </Card>
        ))}
      </Section>
    </>
  );
}
