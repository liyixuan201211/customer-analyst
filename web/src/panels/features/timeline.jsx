import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Select, Empty } from '../ui.jsx';
import { MessageSquare, Phone, Mail, Users2, FileText, Table2, MessageCircle } from 'lucide-react';

const EVICON = { chat: MessageSquare, 'followup': Phone, 'followup-done': Phone, 'order-paid': Mail, 'order-pending': MessageCircle, 'comment': Users2, 'table': Table2, default: FileText };
export default function TimelinePanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { pick: 'Select customer', empty: 'Select a customer to view their timeline' }
    : { pick: '选择客户', empty: '选择客户以查看其触达时间线' };
  const [custs, setCusts] = useState([]); const [cid, setCid] = useState(''); const [data, setData] = useState(null);
  useEffect(() => { api.get('/customers').then(setCusts); }, []);
  useEffect(() => { if (cid) api.get('/timeline/' + cid).then(setData); }, [cid]);
  const label = (e) => Z ? { chat: 'Chat', followup: 'Follow-up', 'followup-done': 'Follow-up done', 'order-paid': 'Order', 'order-pending': 'Order pending', comment: 'Note', table: 'Table' }[e.type] || e.type : { chat: '聊天', followup: '跟进', 'followup-done': '跟进完成', 'order-paid': '订单', 'order-pending': '待确认订单', comment: '协作笔记', table: '表格' }[e.type] || e.type;
  const col = (e) => e.type === 'order-paid' || e.type === 'order-pending' ? 'green' : e.type.startsWith('followup') ? 'amber' : e.type === 'chat' ? 'blue' : 'gray';
  return (
    <>
      <Section title="Timeline" right={<Select value={cid} onChange={e => setCid(e.target.value)} className="w-40"><option value="">{TXT.pick}</option>{custs.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}>
        {!data ? <Empty text={TXT.empty} /> : data.events.map((e, i) => { const Icon = EVICON[e.type] || EVICON.default; return (
          <div key={i} className="flex gap-2 mb-1.5">
            <div className="flex flex-col items-center"><div className="w-7 h-7 rounded-full grid place-items-center text-brand-fg mt-0.5" style={{ background: 'var(--brand)' }}><Icon size={13} /></div>{i < data.events.length - 1 && <div className="flex-1 w-px bg-line-2" />}</div>
            <Card className="flex-1 mb-2"><div className="flex items-center gap-2"><Tag color={col(e)}>{label(e)}</Tag><span className="text-[12px] text-fg-3">{new Date(e.ts).toLocaleString('zh-CN')}</span><span className="flex-1" />{e.meta && <span className="text-[11px] text-fg-2">{e.meta}</span>}</div><div className="text-sm font-medium mt-1">{e.title}</div>{e.detail && <div className="text-xs text-fg-2 mt-0.5">{e.detail}</div>}</Card>
          </div>
        ); })}
      </Section>
    </>
  );
}
