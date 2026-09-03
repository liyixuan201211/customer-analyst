import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Empty } from '../ui.jsx';

export default function PipelinePanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { pipeline: 'Pipeline value', won: 'Won', total: 'Customers', empty: 'No customers' }
    : { pipeline: '管道价值', won: '已成交', total: '客户', empty: '暂无客户' };
  const [data, setData] = useState(null); const [drag, setDrag] = useState(null);
  useEffect(() => { api.get('/pipeline').then(setData); }, []);
  const move = async (id, stage) => { await api.post('/pipeline/move', { customer_id: id, stage }); api.get('/pipeline').then(setData); };
  if (!data) return <Empty text={t('loading')} />;
  return (
    <>
      <Section title="Pipeline" right={<div className="flex gap-2 text-[11px] text-fg-3"><span>{TXT.total}: {data.summary.total}</span><span>{TXT.won}: {data.summary.won}</span><span>{TXT.pipeline}: ￥{data.summary.pipeline}</span></div>}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {data.cols.map(col => (
            <div key={col.stage} className="min-w-[160px] flex-1 rounded-xl bg-bg-2 p-1.5" onDragOver={e => { e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (drag) move(drag, col.stage); setDrag(null); }}>
              <div className="flex items-center justify-between px-1 mb-1"><span className="text-[12px] font-semibold text-fg-2">{col.stage}</span><span className="text-[11px] text-fg-3">{col.customers.length}</span></div>
              {col.customers.map(x => (
                <Card key={x.id} className="mb-1 cursor-grab" onClick={() => move(x.id, col.stage)}>{/* 用 onClick 作为降级，同时支持拖拽 */}
                  <div draggable onDragStart={() => setDrag(x.id)}>
                    <div className="text-[13px] font-medium truncate">{x.name}</div>
                    <div className="text-[10px] text-fg-3">{x.company || ''}</div>
                    <div className="flex items-center gap-1 mt-1"><span className="text-[11px] text-fg-2">¥{x.value}</span>{x.loyalty && <Tag color="indigo">{x.loyalty}</Tag>}</div>
                  </div>
                </Card>
              ))}
              {col.customers.length === 0 && <div className="text-[11px] text-fg-3 text-center py-3">{TXT.empty}</div>}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
