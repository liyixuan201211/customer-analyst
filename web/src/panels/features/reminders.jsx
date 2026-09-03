import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Empty } from '../ui.jsx';

export default function RemindersPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { today: 'Today', overdue: 'Overdue', upcoming: 'Upcoming', done: 'Done', empty: 'Nothing due' }
    : { today: '今日', overdue: '逾期', upcoming: '未来', done: '完成', empty: '暂无到期事项' };
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/reminders').then(setD); }, []);
  if (!d) return <Empty text={t('loading')} />;
  const sec = (title, list, isOverdue) => (
    <Section title={title}>
      {list.length === 0 ? <div className="text-xs text-fg-3">{TXT.empty}</div> : list.map(f => (
        <Card key={f.id} className="mb-1.5"><div className="flex items-center gap-2"><Tag color={isOverdue ? 'red' : f.due_at && new Date(f.due_at).toDateString() === new Date().toDateString() ? 'amber' : 'blue'}>{f.type}</Tag><span className="text-[13px] flex-1 truncate">{f.subject || f.customer_name || f.type}</span>{f.customer_name && <span className="text-[11px] text-fg-3">{f.customer_name}</span>}<Btn size="xs" variant="primary" onClick={async () => { await api.post(`/followups/${f.id}/complete`); api.get('/reminders').then(setD); }}><CheckCircle2 size={11} className="inline" /> {TXT.done}</Btn></div></Card>
      ))}
    </Section>
  );
  return (<>{sec(TXT.overdue, d.overdue, true)}{sec(TXT.today, d.today, false)}{sec(TXT.upcoming, d.upcoming, false)}</>);
}
