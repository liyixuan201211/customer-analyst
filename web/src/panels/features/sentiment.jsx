import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Empty } from '../ui.jsx';

export default function SentimentPanel() {
  const { t, locale } = useI18n();
  const Z = locale === 'en-US';
  const TXT = Z ? { search: 'Search customer', pos: 'Positive', neg: 'Negative', neu: 'Neutral', samples: 'Negative examples', no: 'No customers' }
    : { search: '搜索客户', pos: '正面', neg: '负面', neu: '中性', samples: '负面原句示例', no: '暂无客户' };
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { api.get('/sentiment' + (q ? '?q=' + encodeURIComponent(q) : '')).then(setData); }, [q]);
  if (!data) return <Empty text={t('loading')} />;
  const bar = (v, c) => <div className="flex-1 h-2.5 bg-bg-3 rounded-full overflow-hidden"><div className={`h-full ${c}`} style={{ width: v + '%' }} /></div>;
  return (
    <>
      <Section title={`${TXT.pos} / ${TXT.neg}`} right={<input value={q} onChange={e => setQ(e.target.value)} placeholder={TXT.search} className="w-32 rounded-lg border border-line-2 bg-bg px-2 py-1 text-xs outline-none focus:border-brand/60" />}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Card><div className="text-[11px] text-fg-3">{TXT.pos}</div><div className="text-lg font-semibold text-ok">{data.summary.positive}</div><div className="text-[10px] text-fg-3">{data.summary.avg}%</div></Card>
          <Card><div className="text-[11px] text-fg-3">{TXT.neg}</div><div className="text-lg font-semibold text-danger">{data.summary.negative}</div></Card>
          <Card><div className="text-[11px] text-fg-3">{TXT.neu}</div><div className="text-lg font-semibold">{data.summary.neutral}</div></Card>
        </div>
        {data.list.length === 0 ? <Empty text={TXT.no} /> : data.list.map(x => (
          <Card key={x.id} className="mb-1.5">
            <div className="flex items-center gap-2 mb-1"><div className="flex-1 min-w-0 text-sm font-medium truncate">{x.name}</div>
              <Tag color={x.sentiment === 'positive' ? 'green' : x.sentiment === 'negative' ? 'red' : 'gray'}>
                {x.sentiment === 'positive' ? TXT.pos : x.sentiment === 'negative' ? TXT.neg : TXT.neu} {x.score > 0 ? '+' : ''}{x.score}</Tag></div>
            <div className="flex items-center gap-1.5">
              {bar(Math.min(100, (x.positive / (x.messages || 1)) * 100), 'bg-ok')}
              {bar(Math.min(100, (x.negative / (x.messages || 1)) * 100), 'bg-danger')}
            </div>
            {x.negSamples?.length > 0 && <div className="mt-1.5"><div className="text-[11px] text-fg-3">{TXT.samples}</div>{x.negSamples.map((s, i) => <div key={i} className="text-xs text-danger/80 border-l-2 border-danger/30 pl-2 mt-0.5">“{s}”</div>)}</div>}
          </Card>
        ))}
      </Section>
    </>
  );
}
