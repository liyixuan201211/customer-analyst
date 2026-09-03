import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Empty } from '../ui.jsx';

export default function SegmentsPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { clusters: 'Segments', members: 'members', empty: 'No customers' } : { clusters: '客户分群', members: '位客户', empty: '暂无客户' };
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/segments').then(setD); }, []);
  if (!d) return <Empty text={t('loading')} />;
  return (
    <>
      <Section title={`${TXT.clusters} (${d.total})`}>
        {d.segments.map((s, i) => (
          <Card key={i} className="mb-2">
            <div className="flex items-center gap-2 mb-1"><Tag color="indigo">{s.name}</Tag><span className="text-[11px] text-fg-3">{s.count} {TXT.members}</span></div>
            <div className="flex flex-wrap gap-1">{s.members.map(m => <button key={m.id} onClick={() => useStoreNav(m.id)} className="text-[12px] bg-bg-2 rounded-md px-2 py-0.5 hover:bg-bg-3">{m.name}</button>)}</div>
          </Card>
        ))}
      </Section>
    </>
  );
}
import { useStore } from '../../store/index.js';
function useStoreNav(id) { useStore.getState().showPanel({ view: 'customer', customer_id: id }); }
