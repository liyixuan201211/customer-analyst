import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Empty } from '../ui.jsx';

export default function ConvotagsPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { sum: 'Summarize all', empty: 'No conversations', run: 'Summarize' }
    : { sum: '批量生成摘要', empty: '暂无会话', run: '生成' };
  const [list, setList] = useState([]); const [busy, setBusy] = useState(false);
  const load = () => api.get('/convos/with-tags').then(setList);
  useEffect(() => { load(); }, []);
  const summarizeAll = async () => { setBusy(true); try { await api.post('/summarize-all'); load(); } finally { setBusy(false); } };
  const sumOne = async (id) => { await api.post(`/convos/${id}/summarize`); load(); };
  return (
    <>
      <Section title="Conversation tags" right={<Btn onClick={summarizeAll} disabled={busy}><RefreshCw size={12} className="inline" /> {TXT.sum}</Btn>}>
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(c => (
          <Card key={c.id} className="mb-1.5">
            <div className="flex items-center justify-between"><span className="text-sm font-medium truncate flex-1">{c.title}</span>{c.summary && <Btn size="xs" onClick={() => sumOne(c.id)}>{TXT.run}</Btn>}</div>
            {c.topic && <div className="flex flex-wrap gap-1 mt-1">{[c.topic, ...(c.summary ? [c.summary.slice(0, 40)] : [])].map((x, i) => <Tag key={i} color={i === 0 ? 'indigo' : 'gray'}>{x}</Tag>)}</div>}
            {c.summary && <div className="text-xs text-fg-2 mt-1">{c.summary}</div>}
          </Card>
        ))}
      </Section>
    </>
  );
}
