import React, { useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Select, Empty, Textarea } from '../ui.jsx';

export default function VoicePanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { add: 'Add voice note', customer: 'Customer', file: 'File name', duration: 'Duration(s)', note: 'Summary / transcript', send: 'Save', empty: 'No voice notes' }
    : { add: '新增语音记录', customer: '客户', file: '文件名', duration: '时长(秒)', note: '摘要/转写', send: '保存', empty: '暂无语音记录' };
  const [list, setList] = useState([]); const [custs, setCusts] = useState([]);
  const [f, setF] = useState({ customer_id: '', file_name: '', duration: '', note: '' }); const [show, setShow] = useState(false);
  const load = () => api.get('/voice').then(setList);
  useEffect(() => { api.get('/customers').then(setCusts); load(); }, []);
  const create = async () => { if (!f.customer_id) return; await api.post('/voice', { ...f, duration: +f.duration || null }); setF({ customer_id: '', file_name: '', duration: '', note: '' }); setShow(false); load(); };
  return (
    <>
      <Section title={TXT.add} right={<Btn variant="primary" onClick={() => setShow(!show)}><Plus size={12} className="inline" /> {TXT.add}</Btn>}>
        {show && (
          <Card className="mb-2 fade-in"><div className="grid grid-cols-2 gap-1.5">
            <Select value={f.customer_id} onChange={e => setF({ ...f, customer_id: e.target.value })}><option value="">{TXT.customer}</option>{custs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Input placeholder={TXT.file} value={f.file_name} onChange={e => setF({ ...f, file_name: e.target.value })} />
            <Input type="number" placeholder={TXT.duration} value={f.duration} onChange={e => setF({ ...f, duration: e.target.value })} />
            <Textarea rows={2} placeholder={TXT.note} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} className="col-span-2" />
          </div><Btn variant="primary" className="mt-2" onClick={create}>{TXT.send}</Btn></Card>
        )}
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(v => (
          <Card key={v.id} className="mb-1.5"><div className="flex items-center gap-2"><span className="text-sm flex-1 truncate">{v.customer_name || '—'}</span><Tag color="blue">{v.file_name || '语音'}</Tag>{v.duration && <span className="text-[11px] text-fg-3">{v.duration}s</span>}<button onClick={async () => { await api.del(`/voice/${v.id}`); load(); }} className="text-fg-3 hover:text-danger"><Trash2 size={13} /></button></div>{v.transcript && <div className="text-xs text-fg-2 mt-1">{v.transcript}</div>}</Card>
        ))}
      </Section>
    </>
  );
}
