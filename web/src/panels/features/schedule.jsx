import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Select, Empty } from '../ui.jsx';

export default function SchedulePanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { pick: 'Select customer', rec: 'Recommended time', channel: 'Channel', create: 'Create follow-up' }
    : { pick: '选择客户', rec: '推荐时段', channel: '渠道', create: '创建跟进任务' };
  const [custs, setCusts] = useState([]); const [cid, setCid] = useState(''); const [r, setR] = useState(null);
  useEffect(() => { api.get('/customers').then(setCusts); }, []);
  useEffect(() => { if (cid) api.get('/schedule/recommend/' + cid).then(setR).catch(() => setR(null)); }, [cid]);
  const apply = async () => { await api.post('/schedule/apply', { customer_id: cid, type: r.best_channel === 'email' ? 'email' : 'call', subject: `智能排程·${r.best_channel === 'email' ? '邮件' : '电话'}`, note: r.reason, due_at: r.recommended_at }); alert('已创建跟进任务'); };
  return (
    <>
      <Section title="Smart schedule" right={<Select value={cid} onChange={e => setCid(e.target.value)} className="w-40"><option value="">{TXT.pick}</option>{custs.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}>
        {!r ? <Empty text={TXT.pick} /> : (
          <Card>
            <div className="flex items-center gap-2 mb-2"><Clock size={15} className="text-brand" /><span className="text-sm font-medium">{r.customer}</span><Tag color="indigo">{r.best_channel === 'email' ? '邮件' : '电话'}</Tag></div>
            <div className="text-xs text-fg-2 leading-relaxed">{r.reason}</div>
            <div className="flex items-center gap-2 mt-2 text-[12px]"><span className="text-fg-3">最佳时间：</span><Tag color="blue">{new Date(r.recommended_at).toLocaleString('zh-CN')}</Tag></div>
            <Btn variant="primary" className="mt-3" onClick={apply}>{TXT.create}</Btn>
          </Card>
        )}
      </Section>
    </>
  );
}
