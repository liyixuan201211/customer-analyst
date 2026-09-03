import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Empty } from '../ui.jsx';

const TYPE_LABEL = { price_inversion: '价格倒挂', lowstock_promise: '库存承诺', duplicate_customer: '重复客户', overdue_followup: '逾期跟进' };

export default function AnomalyPanel() {
  const { t, locale } = useI18n();
  const Z = locale === 'en-US';
  const TXT = Z ? { total: 'Issues', high: 'High', med: 'Medium', low: 'Low', no: 'No anomalies 🎉', todo: 'Act' }
    : { total: '异常项', high: '高', med: '中', low: '低', no: '暂无异常 🎉', todo: '前往处理' };
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/anomaly').then(setData); }, []);
  if (!data) return <Empty text={t('loading')} />;
  const sevC = (s) => s === 'high' ? 'red' : s === 'med' ? 'amber' : 'gray';
  const grouped = {};
  data.items.forEach(a => { (grouped[a.type] = grouped[a.type] || []).push(a); });
  const openRef = async (a) => {
    // 跳转到相关视图（跟进/库存），在此仅提示
    if (a.type === 'duplicate_customer') { const { showPanel } = await import('../../store/index.js'); showPanel({ view: 'customer', customer_id: a.refId }); }
  };
  return (
    <>
      <Section title={`${TXT.total} (${data.count})`} right={<div className="flex flex-wrap gap-2 text-[11px] text-fg-3"><Tag color="red">{TXT.high} {data.bySeverity.high || 0}</Tag><Tag color="amber">{TXT.med} {data.bySeverity.med || 0}</Tag><Tag color="gray">{TXT.low} {data.bySeverity.low || 0}</Tag></div>}>
        {data.items.length === 0 ? <Empty text={TXT.no} /> : Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="mb-3">
            <div className="text-[12px] font-semibold text-fg-2 mb-1">{TYPE_LABEL[type] || type}</div>
            {items.map(a => (
              <Card key={a.refId + a.message} className="mb-1.5" onClick={() => openRef(a)}>
                <div className="flex items-center gap-2"><Tag color={sevC(a.severity)}>{a.severity === 'high' ? TXT.high : a.severity === 'med' ? TXT.med : TXT.low}</Tag><span className="text-[13px]">{a.message}</span></div>
              </Card>
            ))}
          </div>
        ))}
      </Section>
    </>
  );
}
