import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { useStore } from '../../store/index.js';
import { Section, Card, Tag, Btn, Select, Empty } from '../ui.jsx';

export default function PermissionsPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { role: 'Role', rules: 'Access rules', my: 'My customers', visibility: 'Visibility', team: 'Team-shared', private: 'Private', member: 'Member', admin: 'Admin', empty: 'No customers' }
    : { role: '角色', rules: '访问规则', my: '我的客户', visibility: '可见性', team: '团队共享', private: '私有', member: '成员', admin: '管理员', empty: '暂无客户' };
  const [perm, setPerm] = useState(null);
  const [mine, setMine] = useState([]);
  const { showPanel } = useStore();
  useEffect(() => { api.get('/permissions').then(setPerm); api.get('/customers/mine').then(setMine); }, []);
  if (!perm) return <Empty text={t('loading')} />;
  const setVis = async (c, v) => { await api.patch(`/customers/${c.id}/visibility`, { visibility: v }); }
  return (
    <>
      <Section title={TXT.role}>
        <Card><Tag color={perm.role === 'admin' ? 'indigo' : 'gray'}>{perm.role === 'admin' ? TXT.admin : TXT.member}</Tag><div className="text-xs text-fg-2 mt-1.5">{perm.rules[perm.role]}</div></Card>
      </Section>
      <Section title={TXT.rules}>
        <Card className="space-y-1.5">{perm.access.map(a => <div key={a.label} className="flex items-center justify-between text-xs"><span className="text-fg-2">{a.label} <span className="text-fg-3">· {a.desc}</span></span><Tag color={a.allowed ? 'green' : 'gray'}>{a.allowed ? '✓' : '✗'}</Tag></div>)}</Card>
      </Section>
      <Section title={`${TXT.my} (${mine.length})`}>
        {mine.length === 0 ? <Empty text={TXT.empty} /> : mine.map(c => (
          <Card key={c.id} className="mb-1.5"><div className="flex items-center gap-2"><span className="text-sm flex-1 cursor-pointer hover:text-brand" onClick={() => showPanel({ view: 'customer', customer_id: c.id })}>{c.name}</span><Tag color={c.visibility === 'private' ? 'red' : 'green'}>{c.visibility === 'private' ? TXT.private : TXT.team}</Tag><Select value={c.visibility} onChange={async e => { await setVis(c, e.target.value); }} className="w-28 text-[11px]"><option value="team">{TXT.team}</option><option value="private">{TXT.private}</option></Select></div></Card>
        ))}
      </Section>
    </>
  );
}
