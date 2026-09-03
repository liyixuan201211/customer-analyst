import React, { useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Textarea, Select, Empty } from '../ui.jsx';

export default function SurveysPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { add: 'New survey', customer: 'Customer', title: 'Title', questions: 'Questions (JSON)', score: 'NPS score', record: 'Record', send: 'Mark done', empty: 'No surveys' }
    : { add: '新建问卷', customer: '客户', title: '标题', questions: '问题（JSON）', score: 'NPS 得分', record: '录入', send: '标记完成', empty: '暂无问卷' };
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState({ customer_id: '', title: '', questions: '' });
  const [showForm, setShowForm] = useState(false);
  const [rec, setRec] = useState({ responses: '', score: '' });
  const load = () => api.get('/surveys').then(setList);
  useEffect(() => { api.get('/customers').then(setCustomers); load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = async () => { if (!f.title) return; let questions = {}; try { questions = JSON.parse(f.questions || '{}'); } catch {} await api.post('/surveys', { ...f, questions }); setF({ customer_id: '', title: '', questions: '' }); setShowForm(false); load(); };
  const record = async (s) => { let responses = {}; try { responses = JSON.parse(rec.responses || '{}'); } catch {} await api.patch(`/surveys/${s.id}`, { responses, score: +rec.score || null, status: 'done' }); setRec({ responses: '', score: '' }); load(); };
  return (
    <>
      <Section title={TXT.add} right={<Btn variant="primary" onClick={() => setShowForm(!showForm)}><Plus size={12} className="inline" /> {TXT.add}</Btn>}>
        {showForm && (
          <Card className="mb-2 fade-in"><div className="grid grid-cols-2 gap-1.5">
            <Select value={f.customer_id} onChange={set('customer_id')}><option value="">{TXT.customer}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Input placeholder={TXT.title} value={f.title} onChange={set('title')} />
            <Textarea rows={2} placeholder={TXT.questions} value={f.questions} onChange={set('questions')} className="col-span-2" />
          </div><div className="flex gap-1.5 mt-2"><Btn variant="primary" onClick={create}>{TXT.add}</Btn><Btn onClick={() => setShowForm(false)}>{t('cancel')}</Btn></div></Card>
        )}
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(s => (
          <Card key={s.id} className="mb-1.5">
            <div className="flex items-center gap-2"><span className="text-sm font-medium flex-1 truncate">{s.title}</span>{s.customer_name && <span className="text-[11px] text-fg-3">{s.customer_name}</span>}<Tag color={s.status === 'done' ? 'green' : s.status === 'sent' ? 'blue' : 'amber'}>{s.status === 'done' ? TXT.send : s.status}</Tag></div>
            {Object.keys(s.questions || {}).length > 0 && <div className="text-[11px] text-fg-3 mt-1">{Object.entries(s.questions).map(([k, v]) => `${k}:${v}`).join(' · ')}</div>}
            {s.score != null && <div className="text-sm font-semibold text-brand mt-1">{TXT.score}：{s.score}</div>}
            {s.status !== 'done' && (
              <div className="grid grid-cols-3 gap-1.5 mt-2"><Input placeholder={TXT.responses + ' JSON'} value={rec.responses} onChange={e => setRec({ ...rec, responses: e.target.value })} /><Input type="number" placeholder={TXT.score} value={rec.score} onChange={e => setRec({ ...rec, score: e.target.value })} /><Btn variant="primary" onClick={() => record(s)}>{TXT.send}</Btn></div>
            )}
            <button onClick={async () => { await api.del(`/surveys/${s.id}`); load(); }} className="mt-1 text-fg-3 hover:text-danger text-xs"><Trash2 size={11} className="inline" /> delete</button>
          </Card>
        ))}
      </Section>
    </>
  );
}
