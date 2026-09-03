import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n.js';
import { Trash2, Plus, UserPlus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useStore } from '../store/index.js';
import { Section, Card, Tag, Btn, Input, Select, Empty } from './ui.jsx';

const BLANK = { name: '', role: '', department: '', phone: '', status: 'active', skills: '' };

export default function StaffPanel() {
  const { t } = useI18n();
  const STATUS = { active: [t('st_active'), 'green'], leave: [t('st_leave'), 'amber'], inactive: [t('st_inactive'), 'gray'] };
  const [data, setData] = useState({ staff: [], assignments: [] });
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [assign, setAssign] = useState({ staff_id: '', customer_id: '' });
  const { send, streaming } = useStore();
  const load = () => { api.get('/staff').then(setData); api.get('/customers').then(setCustomers); };
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const body = { ...f, skills: f.skills.split(/[,，]/).map((s) => s.trim()).filter(Boolean) };
    if (editId) await api.patch(`/staff/${editId}`, body); else await api.post('/staff', body);
    setF(BLANK); setEditId(null); load();
  };
  return (
    <>
      <Section title={editId ? t('st_edit') : t('st_add')}>
        <Card>
          <div className="grid grid-cols-2 gap-1.5">
            <Input placeholder={t('st_name')} value={f.name} onChange={set('name')} /><Input placeholder={t('st_role')} value={f.role} onChange={set('role')} />
            <Input placeholder={t('st_dept')} value={f.department} onChange={set('department')} /><Input placeholder={t('st_phone')} value={f.phone} onChange={set('phone')} />
            <Select value={f.status} onChange={set('status')}><option value="active">{t('st_active')}</option><option value="leave">{t('st_leave')}</option><option value="inactive">{t('st_inactive')}</option></Select>
            <Input placeholder={t('st_skills')} value={f.skills} onChange={set('skills')} />
          </div>
          <div className="flex gap-1.5 mt-2"><Btn variant="primary" disabled={!f.name.trim()} onClick={save}><Plus size={12} className="inline" /> {editId ? '保存' : '新增'}</Btn>{editId && <Btn onClick={() => { setF(BLANK); setEditId(null); }}>{t('st_cancel')}</Btn>}</div>
        </Card>
      </Section>
      <Section title={t('st_assign')}>
        <Card>
          <div className="grid grid-cols-2 gap-1.5">
            <Select value={assign.staff_id} onChange={(e) => setAssign({ ...assign, staff_id: e.target.value })}><option value="">{t('st_choose_member')}</option>{data.staff.map((s) => <option key={s.id} value={s.id}>{s.name}（{s.workload}）</option>)}</Select>
            <Select value={assign.customer_id} onChange={(e) => setAssign({ ...assign, customer_id: e.target.value })}><option value="">{t('st_choose_customer')}</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </div>
          <div className="flex gap-1.5 mt-2">
            <Btn variant="primary" disabled={!assign.staff_id || !assign.customer_id} onClick={async () => { await api.post(`/staff/${assign.staff_id}/assign`, { customer_id: assign.customer_id }); load(); }}><UserPlus size={12} className="inline" /> {t('st_assign_btn')}</Btn>
            <Btn variant="ghost" disabled={streaming || !assign.customer_id} onClick={() => send(`请为客户 ID ${assign.customer_id} 推荐最合适的跟进员工，并说明理由。`)}>{t('st_recommend')}</Btn>
          </div>
        </Card>
      </Section>
      <Section title={`员工 (${data.staff.length})`}>
        {data.staff.length === 0 ? <Empty text={t('st_none')} /> : data.staff.map((s) => {
          const [label, color] = STATUS[s.status] || STATUS.active;
          const mine = data.assignments.filter((a) => a.staff_id === s.id);
          return (
            <Card key={s.id} className="mb-1.5">
              <div className="flex items-start justify-between">
                <div><div className="text-sm font-medium">{s.name} <span className="text-[11px] text-fg-3">{[s.role, s.department].filter(Boolean).join(' · ')}</span></div>
                  <div className="flex flex-wrap gap-1 mt-1">{s.skills.map((k) => <Tag key={k} color="indigo">{k}</Tag>)}</div></div>
                <div className="text-right"><Tag color={color}>{label}</Tag><div className="text-[11px] text-fg-3 mt-1">{t('st_customers')}{s.workload} 客户</div></div>
              </div>
              {mine.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{mine.map((a) => <span key={a.id} className="text-[11px] bg-bg-3 rounded px-1.5 py-0.5 flex items-center gap-1">{a.customer_name}<button onClick={async () => { await api.post(`/staff/${s.id}/assign`, { customer_id: a.customer_id, unassign: true }); load(); }} className="text-fg-3 hover:text-danger">×</button></span>)}</div>}
              <div className="flex gap-1 mt-2">
                <Btn size="xs" onClick={() => { setEditId(s.id); setF({ name: s.name, role: s.role || '', department: s.department || '', phone: s.phone || '', status: s.status, skills: s.skills.join(', ') }); }}>编辑</Btn>
                <Btn size="xs" variant="danger" onClick={async () => { if (confirm('删除员工？')) { await api.del(`/staff/${s.id}`); load(); } }}><Trash2 size={11} /></Btn>
              </div>
            </Card>
          );
        })}
      </Section>
    </>
  );
}
