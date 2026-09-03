import React, { useEffect } from 'react';
import { Users as UsersIcon, Plus } from 'lucide-react';
import { useStore } from '../store/index.js';
import { useI18n } from '../i18n.js';
import { Section, Card, Tag, Btn, Input, Select, Empty } from './ui.jsx';

const ACT = { create: 'a_act_create', update: 'a_act_update', import: 'a_act_import', analyze: 'a_act_analyze', pricing: 'a_act_pricing', assign: 'a_act_assign', add: 'a_act_add', comment: 'a_act_comment', chat: 'a_act_chat', delete: 'a_act_delete', invite: 'a_act_invite' };
const ENT = { customer: 'a_ent_customer', product: 'a_ent_product', staff: 'a_ent_staff', kb: 'a_ent_kb', conversation: 'a_ent_conversation' };
const colorFor = (action) => ({ create: 'green', update: 'blue', import: 'indigo', analyze: 'indigo', pricing: 'amber', assign: 'blue', add: 'green', comment: 'blue', chat: 'gray', delete: 'red', invite: 'gray' }[action] || 'gray');

export function ActivityPanel() {
  const { activity, loadActivity } = useStore();
  const { t } = useI18n();
  useEffect(() => { loadActivity(); }, []);
  return (
    <Section title={t('act_title')}>
      {activity.length === 0 ? <Empty text={t('act_empty')} /> : activity.map((a) => (
        <Card key={a.id} className="mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full grid place-items-center text-brand-fg text-[10px] font-semibold" style={{ background: 'var(--brand)', opacity: .85 }}>{(a.actor_name || '?').slice(0, 1)}</div>
            <div className="flex-1 min-w-0 text-[12.5px]"><span className="font-medium">{a.actor_name}</span> <span className="text-fg-2">{t(ACT[a.action] || 'a_act_update')} {t(ENT[a.entity] || a.entity)}</span></div>
            <div className="text-[11px] text-fg-3 shrink-0">{rel(a.created_at)}</div>
          </div>
          {a.detail && <div className="text-[12px] text-fg-2 mt-1 pl-8 truncate">{a.detail}</div>}
        </Card>
      ))}
    </Section>
  );
}

export function MembersPanel() {
  const { members, loadMembers, user, updateMe } = useStore();
  const { t, locale } = useI18n();
  const [f, setF] = React.useState({ username: '', password: '', display_name: '', role: 'member', locale });
  useEffect(() => { loadMembers(); }, []);
  const isAdmin = user?.role === 'admin';
  const create = async () => {
    if (!f.username.trim() || !f.password) return;
    await useStore.getState().loadMembers();
    setF({ username: '', password: '', display_name: '', role: 'member', locale });
  };
  return (
    <>
      {isAdmin && (
        <Section title={t('u_members')}>
          <Card>
            <div className="grid grid-cols-2 gap-1.5">
              <Input placeholder={t('login_user')} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
              <Input type="password" placeholder={t('login_pass')} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              <Input placeholder={t('login_name')} value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
              <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="member">{t('u_role_member')}</option><option value="admin">{t('u_role_admin')}</option></Select>
            </div>
            <Btn variant="primary" className="mt-2" disabled={!f.username.trim() || !f.password} onClick={create}><Plus size={12} className="inline" /> {t('register_btn')}</Btn>
          </Card>
        </Section>
      )}
      <Section title={`${t('u_members')} (${members.length})`}>
        {members.length === 0 ? <Empty text={t('no_chat')} /> : members.map((m) => (
          <Card key={m.id} className="mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full grid place-items-center text-brand-fg text-[13px] font-semibold" style={{ background: m.avatar_color || 'var(--brand)' }}>{(m.display_name || m.username).slice(0, 1).toUpperCase()}</div>
              <div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{m.display_name || m.username} {m.id === user.id && <span className="text-[10px] text-fg-3">(you)</span>}</div><div className="text-[11px] text-fg-3">@{m.username} · {m.role === 'admin' ? t('u_role_admin') : t('u_role_member')}</div></div>
              <Tag color={m.online ? 'green' : 'gray'}>{m.online ? t('u_online') : t('u_offline')}</Tag>
            </div>
          </Card>
        ))}
      </Section>
    </>
  );
}

function rel(ts) {
  const d = Date.now() - ts; if (d < 60000) return '刚刚'; if (d < 3600000) return Math.floor(d / 60000) + 'm'; if (d < 86400000) return Math.floor(d / 3600000) + 'h'; return Math.floor(d / 86400000) + 'd';
}
