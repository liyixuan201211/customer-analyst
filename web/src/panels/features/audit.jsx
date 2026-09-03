import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Select, Empty } from '../ui.jsx';

const ACTC = { create: 'green', update: 'blue', import: 'indigo', analyze: 'indigo', pricing: 'amber', assign: 'blue', add: 'green', comment: 'blue', chat: 'gray', delete: 'red', invite: 'gray' };
export default function AuditPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { entity: 'Entity', action: 'Action', export: 'Export CSV', empty: 'No activity' }
    : { entity: '对象', action: '动作', export: '导出 CSV', empty: '暂无动态' };
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/activity?limit=200').then(setList); }, []);
  return (
    <>
      <Section title="Audit" right={<a href="/api/audit/export.csv" className="rounded-md bg-elev border border-line-2 hover:bg-bg-3 px-2 py-1 text-[11px] flex items-center gap-1"><Download size={11} /> {TXT.export}</a>}>
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(a => (
          <Card key={a.id} className="mb-1.5 flex items-center gap-2"><Tag color={ACTC[a.action] || 'gray'}>{a.action}</Tag><span className="text-[11px] text-fg-3 w-16">{a.entity}</span><span className="text-[13px] flex-1 truncate">{a.actor_name} {a.detail || ''}</span><span className="text-[11px] text-fg-3 shrink-0">{new Date(a.created_at).toLocaleString('zh-CN')}</span></Card>
        ))}
      </Section>
    </>
  );
}
