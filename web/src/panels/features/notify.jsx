import React, { useEffect, useState } from 'react';
import { Send, Save } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Empty } from '../ui.jsx';

const CH = [['dingtalk', '钉钉'], ['wecom', '企业微信'], ['telegram', 'Telegram']];
export default function NotifyPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { cfg: 'Channels', text: 'Message', channel: 'Channel', send: 'Send test', remind: 'Push reminders', save: 'Save' }
    : { cfg: '渠道配置', text: '消息内容', channel: '渠道', send: '发送测试', remind: '推送到期/审批', save: '保存' };
  const [cfg, setCfg] = useState({}); const [text, setText] = useState(''); const [chan, setChan] = useState('dingtalk');
  useEffect(() => { api.get('/notify/config').then(d => setCfg(d.config || {})); }, []);
  const save = async () => { await api.post('/notify/config', cfg); alert('已保存'); };
  const send = async () => { const r = await api.post('/notify/send', { channel: chan, text: text || '测试通知' }); alert(r.ok ? '已发送 ✓' : '失败：' + (r.error || '')); };
  const remind = async () => { const r = await api.post('/notify/reminders'); alert(r.ok ? '已推送 ✓' : '失败：' + (r.error || '')); };
  return (
    <>
      <Section title={TXT.cfg} right={<Btn size="xs" onClick={save}><Save size={11} className="inline" /> {TXT.save}</Btn>}>
        <Card className="mb-2 space-y-1.5">
          {CH.map(([code, label]) => <div key={code} className="flex items-center gap-2"><span className="w-20 text-xs text-fg-2">{label}</span><Input placeholder="Webhook URL" value={cfg[code] || ''} onChange={e => setCfg({ ...cfg, [code]: e.target.value })} className="flex-1" /></div>)}
          <div className="text-[11px] text-fg-3">钉钉/企微：机器人 webhook 地址；Telegram：bot_token|chat_id</div>
        </Card>
      </Section>
      <Section title={TXT.channel}>
        <Card><div className="flex gap-1.5 mb-2">{CH.map(([code, label]) => <button key={code} onClick={() => setChan(code)} className={`px-2 py-1 text-[11px] rounded-lg ${chan === code ? 'bg-brand-soft text-brand' : 'text-fg-2 hover:bg-bg-3'}`}>{label}</button>)}</div>
          <Input placeholder={TXT.text} value={text} onChange={e => setText(e.target.value)} />
          <div className="flex gap-1.5 mt-2"><Btn variant="primary" onClick={send}><Send size={12} className="inline" /> {TXT.send}</Btn><Btn onClick={remind}>{TXT.remind}</Btn></div>
        </Card>
      </Section>
    </>
  );
}
