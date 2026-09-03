import React, { useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Select, Empty } from '../ui.jsx';

const STATUS = [['pending', '待确认'], ['paid', '已成交'], ['cancelled', '已取消']];

export default function OrdersPanel() {
  const { t, locale } = useI18n();
  const Z = locale === 'en-US';
  const TXT = Z ? { add: 'Add order', customer: 'Customer', product: 'Product', qty: 'Qty', price: 'Unit price', status: 'Status', date: 'Date', total: 'Total revenue', count: 'Orders', filter: 'All', export: 'Leave blank to keep', empty: 'No orders yet', stats: 'Order stats' }
    : { add: '新增订单', customer: '客户', product: '商品', qty: '数量', price: '单价', status: '状态', date: '日期', total: '总成交额', count: '订单数', filter: '全部', export: '', empty: '暂无订单', stats: '成交统计' };
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('');
  const [f, setF] = useState({ customer_id: '', product_name: '', qty: 1, unit_price: '', status: 'pending', order_date: new Date().toISOString().slice(0, 10) });
  const [showForm, setShowForm] = useState(false);
  const load = () => { api.get('/orders' + (status ? '?status=' + status : '')).then(setList); api.get('/orders/stats').then(setStats); };
  useEffect(() => { api.get('/customers').then(setCustomers); load(); }, [status]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = async () => {
    if (!f.customer_id) return;
    await api.post('/orders', { ...f, qty: +f.qty, unit_price: +f.unit_price || 0, order_date: new Date(f.order_date + 'T09:00:00').getTime() });
    setF({ customer_id: '', product_name: '', qty: 1, unit_price: '', status: 'pending', order_date: new Date().toISOString().slice(0, 10) }); setShowForm(false); load();
  };
  return (
    <>
      <Section title={TXT.stats}>
        <div className="grid grid-cols-3 gap-2">
          <Card><div className="text-[11px] text-fg-3">{TXT.total}</div><div className="text-lg font-semibold tabular-nums">¥{stats?.total ?? 0}</div></Card>
          <Card><div className="text-[11px] text-fg-3">{TXT.count}</div><div className="text-lg font-semibold tabular-nums">{stats?.count ?? 0}</div></Card>
          <Card><div className="text-[11px] text-fg-3">{TXT.status}</div><div className="text-lg font-semibold tabular-nums">{stats?.byStatus?.paid ?? 0}/{stats?.count ?? 0}</div></Card>
        </div>
      </Section>
      <Section title={TXT.add} right={<div className="flex gap-1"><Btn variant="primary" onClick={() => setShowForm(!showForm)}><Plus size={12} className="inline" /> {TXT.add}</Btn></div>}>
        {showForm && (
          <Card className="mb-2 fade-in">
            <div className="grid grid-cols-2 gap-1.5">
              <Select value={f.customer_id} onChange={set('customer_id')}><option value="">{TXT.customer}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
              <Input placeholder={TXT.product} value={f.product_name} onChange={set('product_name')} />
              <Input type="number" placeholder={TXT.qty} value={f.qty} onChange={set('qty')} />
              <Input type="number" placeholder={TXT.price} value={f.unit_price} onChange={set('unit_price')} />
              <Select value={f.status} onChange={set('status')}>{STATUS.map(s => <option key={s[0]} value={s[0]}>{s[1]}</option>)}</Select>
              <Input type="date" value={f.order_date} onChange={set('order_date')} />
            </div>
            <div className="flex gap-1.5 mt-2"><Btn variant="primary" disabled={!f.customer_id} onClick={create}>{TXT.add}</Btn><Btn onClick={() => setShowForm(false)}>{t('cancel')}</Btn></div>
          </Card>
        )}
      </Section>
      <Section title={`${TXT.customer} (${list.length})`} right={<Select value={status} onChange={e => setStatus(e.target.value)} className="w-28"><option value="">{TXT.filter}</option>{STATUS.map(s => <option key={s[0]} value={s[0]}>{s[1]}</option>)}</Select>}>
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(o => (
          <Card key={o.id} className="mb-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{o.customer_name || '—'} · {o.product_name || ''}</div><div className="text-[11px] text-fg-3">{o.qty} × ¥{o.unit_price} {o.product_name ? '· ' : ''}{o.order_date ? new Date(o.order_date).toLocaleDateString('zh-CN') : ''}</div></div>
              <Tag color={o.status === 'paid' ? 'green' : o.status === 'cancelled' ? 'gray' : 'amber'}>{STATUS.find(s => s[0] === o.status)?.[1] || o.status}</Tag>
              <span className="text-sm font-semibold tabular-nums">¥{o.amount}</span>
              <Btn size="xs" variant="danger" onClick={async () => { if (confirm('?')) { await api.del(`/orders/${o.id}`); load(); } }}><Trash2 size={11} /></Btn>
            </div>
          </Card>
        ))}
      </Section>
    </>
  );
}
