import React, { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Trash2, Phone, Mail, MessageCircle, Users2, CalendarClock, Copy, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { useStore } from '../store/index.js';
import { useI18n } from '../i18n.js';
import { Section, Card, Tag, Btn, Input, Select, Textarea, Empty } from './ui.jsx';

const TYPES = [['call', 'fu_type_call', Phone], ['email', 'fu_type_email', Mail], ['whatsapp', 'fu_type_whatsapp', MessageCircle], ['meeting', 'fu_type_meeting', Users2], ['other', 'fu_type_other', CalendarClock]];
const typeIcon = (ty) => (TYPES.find((t) => t[0] === ty) || TYPES[4])[2];

export default function FollowupPanel({ filter }) {
  const { t } = useI18n();
  const [tab, setTab] = useState(filter || 'today');
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState({ customer_id: '', type: 'call', subject: '', note: '', due_at: '' });
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async (st = tab) => { setList(await api.get('/followups?status=' + st)); };
  useEffect(() => { api.get('/customers').then(setCustomers); load(tab); }, [tab]);
  const today = new Date().toISOString().slice(0, 10);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = async () => {
    if (!f.customer_id) return; setBusy(true);
    try { const due = f.due_at ? new Date(f.due_at + 'T09:00:00').getTime() : null; await api.post('/followups', { ...f, due_at: due }); setF({ customer_id: '', type: 'call', subject: '', note: '', due_at: '' }); setShowForm(false); load(); } catch (e) { alert(e.message); } finally { setBusy(false); }
  };
  const tabs = [['overdue', t('fu_overdue')], ['today', t('fu_today')], ['upcoming', t('fu_upcoming')], ['pending', t('fu_all')], ['done', t('fu_done')]];
  return (
    <>
      <div className="flex flex-wrap gap-1 mb-3 items-center">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-1.5 text-xs rounded-lg ${tab === k ? 'bg-brand-soft text-brand font-medium' : 'text-fg-2 hover:bg-bg-3'}`}>{l}</button>)}
        <div className="flex-1" />
        <Btn variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={12} className="inline" /> {t('fu_add')}</Btn>
      </div>

      {showForm && (
        <Card className="mb-3 fade-in">
          <div className="grid grid-cols-2 gap-1.5">
            <Select value={f.customer_id} onChange={set('customer_id')}><option value="">{t('fu_choose_customer')}</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Select value={f.type} onChange={set('type')}>{TYPES.map((ty) => <option key={ty[0]} value={ty[0]}>{t(ty[1])}</option>)}</Select>
            <Input placeholder={t('fu_subject')} value={f.subject} onChange={set('subject')} className="col-span-2" />
            <Input type="date" value={f.due_at} onChange={set('due_at')} className="col-span-2" />
            <Textarea rows={2} placeholder={t('fu_note')} value={f.note} onChange={set('note')} className="col-span-2" />
          </div>
          <div className="flex gap-1.5 mt-2"><Btn variant="primary" disabled={busy || !f.customer_id} onClick={create}>{t('fu_create')}</Btn><Btn onClick={() => setShowForm(false)}>{t('cancel')}</Btn></div>
        </Card>
      )}

      {list.length === 0 ? <Empty text={t('fu_empty')} /> : list.map((fu) => {
        const Icon = typeIcon(fu.type);
        const dt = fu.due_at ? new Date(fu.due_at) : null;
        const isDue = dt && dt.getTime() < Date.now() && fu.status === 'pending';
        return (
          <Card key={fu.id} className={`mb-1.5 ${fu.status === 'done' ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg grid place-items-center text-brand-fg mt-0.5 shrink-0" style={{ background: 'var(--brand)' }}><Icon size={14} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5"><span className={`text-[13px] ${fu.status === 'done' ? 'line-through' : 'font-medium'}`}>{fu.subject || t('fu_type_' + fu.type)}</span><Tag color={isDue ? 'red' : fu.status === 'done' ? 'green' : 'blue'}>{fu.status === 'done' ? t('fu_done') : isDue ? t('fu_overdue') : t('fu_type_' + fu.type)}</Tag></div>
                {fu.customer_name && <div className="text-[11px] text-fg-3 mt-0.5">{t('fu_customer')}：{fu.customer_name}</div>}
                {fu.note && <div className="text-xs text-fg-2 mt-1">{fu.note}</div>}
                <div className="text-[11px] text-fg-3 mt-1">{dt ? dt.toLocaleString('zh-CN') : ''} {fu.assignee_name ? ` · ${fu.assignee_name}` : ''}</div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {fu.status !== 'done' && <Btn size="xs" variant="primary" onClick={async () => { await api.post(`/followups/${fu.id}/complete`); load(); }}><CheckCircle2 size={11} className="inline" /> {t('fu_complete')}</Btn>}
                <Btn size="xs" variant="danger" onClick={async () => { if (confirm('?')) { await api.del(`/followups/${fu.id}`); load(); } }}><Trash2 size={11} /></Btn>
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
}

/** 生成跟进邮件/WhatsApp 的展示与操作 */
export function FollowupMessage({ msg, customerId, onDone }) {
  const { t, locale } = useI18n();
  const [type, setType] = useState(msg?.type || 'email');
  const [language, setLanguage] = useState(msg?.language || (locale === 'en-US' ? 'en' : 'zh'));
  const [data, setData] = useState(msg || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const gen = async () => {
    setBusy(true); setErr('');
    try { setData(await api.post(`/customers/${customerId}/followup-message`, { type, language })); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const copy = (txt) => navigator.clipboard.writeText(txt);
  return (
    <Card className="mb-3">
      <div className="flex gap-1.5 mb-2">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="flex-1">{['email', 'whatsapp'].map((x) => <option key={x} value={x}>{t('fu_' + x)}</option>)}</Select>
        <Select value={language} onChange={(e) => setLanguage(e.target.value)} className="flex-1"><option value="zh">{t('fu_zh')}</option><option value="en">{t('fu_en')}</option></Select>
        <Btn variant="primary" disabled={busy} onClick={gen}><RefreshCw size={12} className="inline" /> {t('fu_gen')}</Btn>
      </div>
      {err && <div className="text-xs text-danger mb-2">{err}</div>}
      {data && (
        <div className="space-y-2">
          <div><div className="text-[11px] text-fg-3">{t('fu_subject_l')}</div><div className="text-[13px] font-medium flex items-center gap-1">{data.subject}</div></div>
          <div className="rounded-lg border border-line bg-bg-2 p-2 max-h-64 overflow-y-auto"><pre className="text-[12.5px] whitespace-pre-wrap leading-relaxed">{data.body}</pre></div>
          <div className="flex gap-1.5"><Btn size="xs" onClick={() => copy(data.body)}><Copy size={11} className="inline" /> {t('fu_copy_msg')}</Btn></div>
          {data.tone && <div className="text-[11px] text-fg-3">{t('fu_tone')}：{data.tone}</div>}
          {data.key_points?.length > 0 && <div className="text-xs text-fg-2">{t('fu_keypoints')}：{data.key_points.join('、')}</div>}
          {data.cta && <div className="text-xs text-brand">{t('fu_cta')}：{data.cta}</div>}
        </div>
      )}
    </Card>
  );
}
