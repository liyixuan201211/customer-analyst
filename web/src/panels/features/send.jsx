import React, { useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Select, Empty, Textarea } from '../ui.jsx';

const STATUS = [['scheduled', '待发送'], ['sent', '已发送'], ['opened', '已打开'], ['replied', '已回复'], ['failed', '失败']];
const STATUS_C = { scheduled: 'amber', sent: 'blue', opened: 'blue', replied: 'green', failed: 'red' };
export default function SendPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { add: 'Schedule send', customer: 'Customer', type: 'Type', body: 'Content', channel: 'Channel', empty: 'No send tasks', funnel: 'Funnel' }
    : { add: '定时发送', customer: '客户', type: '类型', body: '内容', empty: '暂无发送任务', funnel: '触达漏斗' };
  const [d, setD] = useState(null); const [custs, setCusts] = useState([]);
  const [f, setF] = useState({ customer_id: '', type: 'email', body: '' }); const [show, setShow] = useState(false);
  const load = () => api.get('/send').then(setD);
  useEffect(() => { api.get('/customers').then(setCusts); load(); }, []);
  const create = async () => { if (!f.customer_id || !f.body.trim()) return; await api.post('/send', f); setF({ customer_id: '', type: 'email', body: '' }); setShow(false); load(); };
  const mark = async (id) => { const s = STATUS[1][0]; await api.post(`/send/${id}/status`, { status: s }); load(); };
  if (!d) return <Empty text={t('loading')} />;
  return (
    <>
      <Section title={TXT.add} right={<Btn variant="primary" onClick={() => setShow(!show)}><Plus size={12} className="inline" /> {TXT.add}</Btn>}>
        <div className="grid grid-cols-5 gap-1.5 mb-3">{STATUS.map(([s, l]) => <Card key={s} className="text-center"><div className="text-lg font-semibold">{d.byStatus[s] || 0}</div><div className="text-[10px] text-fg-3">{l}</div></Card>)}</div>
        {show && (
          <Card className="mb-2 fade-in"><div className="grid grid-cols-2 gap-1.5">
            <Select value={f.customer_id} onChange={e => setF({ ...f, customer_id: e.target.value })}><option value="">{TXT.customer}</option>{custs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="email">Email</option><option value="whatsapp">WhatsApp</option></Select>
            <Textarea rows={3} placeholder={TXT.body} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} className="col-span-2" />
          </div><div className="flex gap-1.5 mt-2"><Btn variant="primary" onClick={create}>{TXT.add}</Btn><Btn onClick={() => setShow(false)}>{t('cancel')}</Btn></div></Card>
        )}
        {d.list.length === 0 ? <Empty text={TXT.empty} /> : d.list.map(x => (
          <Card key={x.id} className="mb-1.5"><div className="flex items-center gap-2"><span className="text-sm flex-1 truncate">{x.customer_name} · {x.type}</span><Tag color={STATUS_C[x.send_status || 'scheduled']}>{STATUS.find(s => s[0] === (x.send_status || 'scheduled'))?.[1]}</Tag>{x.send_status === 'scheduled' && <Btn size="xs" onClick={() => mark(x.id)}>确认已发送</Btn>}<button onClick={async () => { await api.del(`/send/${x.id}`); load(); }} className="text-fg-3 hover:text-danger"><Trash2 size={13} /></button></div>{x.message_content && <div className="text-xs text-fg-2 mt-1 truncate">{x.message_content}</div>}</Card>
        ))}
      </Section>
    </>
  );
}
