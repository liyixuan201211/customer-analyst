import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Empty, Score } from '../ui.jsx';

export default function ChurnPanel() {
  const { t, locale } = useI18n();
  const Z = locale === 'en-US';
  const TXT = Z ? { title: 'Churn prediction', high: 'High risk', avg: 'Avg risk', suggestion: 'Suggestion', no: 'No customers yet', signals: 'Signals', open: 'Open' }
    : { title: '流失预测', high: '高危', avg: '平均风险分', suggestion: '建议动作', no: '暂无客户', signals: '信号', open: '查看' };
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/churn').then(setData); }, []);
  if (!data) return <Empty text={t('loading')} />;
  const riskC = (r) => r === 'high' ? 'red' : r === 'med' ? 'amber' : 'green';
  const row = (x, i) => (
    <Card key={x.id} className="mb-1.5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md grid place-items-center text-brand-fg text-[10px] font-semibold" style={{ background: 'var(--brand)' }}>{i + 1}</div>
        <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{x.name} <span className="text-[11px] text-fg-3">{x.company || ''}</span></div>
          <div className="flex flex-wrap gap-1 mt-0.5">{x.signals.slice(0, 4).map((s, k) => <Tag key={k} color="gray">{s}</Tag>)}</div></div>
        <div className="w-24 shrink-0"><Score value={x.score} /></div>
        <Tag color={riskC(x.risk)}>{x.risk === 'high' ? TXT.high : x.risk === 'med' ? '中' : '低'}</Tag>
      </div>
      {x.risk !== 'low' && <div className="text-xs text-fg-2 mt-1.5 pl-8">{TXT.suggestion}：{x.suggestion}</div>}
    </Card>
  );
  return (
    <>
      <Section title={`${TXT.title} · ${data.list.length}`} right={<div className="text-[11px] text-fg-3">{TXT.avg}：{data.summary.avg} · {TXT.high}：{data.summary.high}</div>}>
        {data.high.length > 0 && <div className="mb-3 rounded-xl border border-danger/30 bg-danger/10 p-2"><div className="text-[11px] text-danger font-medium mb-1">{TXT.high} Top</div>{data.high.map((x, i) => row(x, i))}</div>}
        {data.list.length === 0 ? <Empty text={TXT.no} /> : data.list.map((x, i) => row(x, i))}
        <div className="text-[11px] text-fg-3 mt-1">{TXT.open}：对客户调用 /api/churn/:id 可看详情（在客户档案可触发跟进）</div>
      </Section>
    </>
  );
}
