import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Select, Empty } from '../ui.jsx';

const TRIGGERS = [['silent_days', '沉默天数'], ['complaint', '检测到投诉'], ['new_order', '新成交'], ['low_stock', '低库存'], ['no_followup', '无跟进']];
const ACTIONS = [['create_followup', '自动建跟进'], ['send_survey', '自动发问卷'], ['tag', '自动打标签']];
export default function AutomationPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { rules: 'Rules', add: 'New rule', run: 'Run now', name: 'Name', trigger: 'Trigger', action: 'Action', days: 'Days', result: 'Triggered', empty: 'No rules', log: 'Run log' }
    : { rules: '触发规则', add: '新建规则', run: '立即执行', name: '名称', trigger: '触发', action: '动作', days: '天数', result: '已触发', empty: '暂无规则', log: '执行日志' };
  const [list, setList] = useState([]); const [f, setF] = useState({ name: '', trigger: 'silent_days', days: 30, action: 'create_followup', subject: '' });
  const [run, setRun] = useState(null); const [show, setShow] = useState(false);
  const load = () => api.get('/automation/rules').then(setList);
  useEffect(() => { load(); }, []);
  const create = async () => { if (!f.name) return; await api.post('/automation/rules', { name: f.name, trigger: f.trigger, condition: { days: +f.days }, action: f.action, action_config: { subject: f.subject || `${f.name}跟进` } }); setF({ name: '', trigger: 'silent_days', days: 30, action: 'create_followup', subject: '' }); setShow(false); load(); };
  const runAll = async () => setRun(await api.post('/automation/run', {}));
  return (
    <>
      <Section title={TXT.rules} right={<div className="flex gap-1"><Btn variant="primary" onClick={runAll}><Play size={12} className="inline" /> {TXT.run}</Btn><Btn onClick={() => setShow(!show)}><Plus size={12} className="inline" /> {TXT.add}</Btn></div>}>
        {show && (
          <Card className="mb-2 fade-in"><div className="grid grid-cols-3 gap-1.5">
            <Input placeholder={TXT.name} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            <Select value={f.trigger} onChange={e => setF({ ...f, trigger: e.target.value })}>{TRIGGERS.map(x => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</Select>
            <Select value={f.action} onChange={e => setF({ ...f, action: e.target.value })}>{ACTIONS.map(x => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</Select>
            {f.trigger === 'silent_days' && <Input type="number" placeholder={TXT.days} value={f.days} onChange={e => setF({ ...f, days: e.target.value })} />}
            <Input placeholder="主题" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} className="col-span-2" />
          </div><Btn variant="primary" className="mt-2" onClick={create}>{TXT.add}</Btn></Card>
        )}
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(r => (
          <Card key={r.id} className="mb-1.5">
            <div className="flex items-center gap-2"><span className="text-sm font-medium flex-1 truncate">{r.name}</span><Tag color={r.active ? 'green' : 'gray'}>{r.trigger}</Tag><span className="text-[11px] text-fg-3">{r.runs} 次</span><button onClick={async () => { await api.del(`/automation/rules/${r.id}`); load(); }} className="text-fg-3 hover:text-danger"><Trash2 size={13} /></button></div>
            <div className="text-[11px] text-fg-3 mt-0.5">{TRIGGERS.find(x => x[0] === r.trigger)?.[1]} → {ACTIONS.find(x => x[0] === r.action)?.[1]} {r.trigger === 'silent_days' ? `（≥${r.condition.days}天）` : ''}</div>
          </Card>
        ))}
        {run && (
          <Card className="mt-2"><div className="text-sm font-medium mb-1">{TXT.result}：{run.triggered}</div>{run.log.slice(0, 20).map((x, i) => <div key={i} className="text-xs text-fg-2 py-0.5">• [{x.rule}] {x.reason} → {x.target}（{x.action}）</div>)}</Card>
        )}
      </Section>
    </>
  );
}
