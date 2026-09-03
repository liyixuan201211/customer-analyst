import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { useStore } from '../../store/index.js';
import { Section, Card, Tag, Btn, Input, Select, Empty } from '../ui.jsx';

export default function ApprovalsPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const { user } = useStore(); const isAdm = user?.role === 'admin';
  const TXT = Z ? { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', subject: 'Subject', reason: 'Reason', approve: 'Approve', reject: 'Reject', request: 'Request', btn: 'Review', empty: 'No approvals' }
    : { pending: '待审批', approved: '已通过', rejected: '已拒绝', subject: '主题', reason: '理由', approve: '通过', reject: '拒绝', request: '发起审批', btn: '审批', empty: '暂无审批' };
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [f, setF] = useState({ entity_type: 'pricing', subject: '', amount: '', reason: '' });
  const [showForm, setShowForm] = useState(false);
  const load = () => api.get('/approvals' + (status ? '?status=' + status : '')).then(setList);
  useEffect(() => { load(); }, [status]);
  const statTag = (s) => s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'amber';
  return (
    <>
      <Section title={TXT.request} right={<Btn variant="primary" onClick={() => setShowForm(!showForm)}>{TXT.request}</Btn>}>
        {showForm && (
          <Card className="mb-2 fade-in"><div className="grid grid-cols-2 gap-1.5">
            <Select value={f.entity_type} onChange={e => setF({ ...f, entity_type: e.target.value })}><option value="pricing">pricing</option><option value="discount">discount</option><option value="product">product</option></Select>
            <Input placeholder={TXT.subject} value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} />
            <Input type="number" placeholder="金额" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /><Input placeholder={TXT.reason} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} />
          </div><Btn variant="primary" className="mt-2" onClick={async () => { await api.post('/approvals', { ...f, amount: +f.amount || null }); setF({ entity_type: 'pricing', subject: '', amount: '', reason: '' }); setShowForm(false); load(); }}>{TXT.request}</Btn></Card>
        )}
      </Section>
      <Section title={`${TXT.pending} / ${TXT.approved}`} right={<div className="flex gap-1">{['', 'pending', 'approved'].map(s => <button key={s} onClick={() => setStatus(s)} className={`px-2 py-1 text-[11px] rounded-lg ${status === s ? 'bg-brand-soft text-brand' : 'text-fg-2 hover:bg-bg-3'}`}>{s === '' ? 'All' : TXT[s]}</button>)}</div>}>
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(a => (
          <Card key={a.id} className="mb-1.5"><div className="flex items-center gap-2"><Tag color={statTag(a.status)}>{TXT[a.status] || a.status}</Tag><Tag color="gray">{a.entity_type}</Tag><span className="text-[13px] flex-1 truncate">{a.subject || a.entity_type}</span>{a.amount != null && <span className="text-sm font-semibold">¥{a.amount}</span>}{a.requested_by_name && <span className="text-[11px] text-fg-3">{a.requested_by_name}</span>}</div>
            {a.reason && <div className="text-xs text-fg-2 mt-1">{a.reason}</div>}
            {a.status === 'pending' && isAdm && <div className="flex gap-1 mt-2"><Btn variant="primary" onClick={async () => { await api.post(`/approvals/${a.id}/review`, { status: 'approved' }); load(); }}>{TXT.approve}</Btn><Btn variant="danger" onClick={async () => { await api.post(`/approvals/${a.id}/review`, { status: 'rejected' }); load(); }}>{TXT.reject}</Btn></div>}
          </Card>
        ))}
      </Section>
    </>
  );
}