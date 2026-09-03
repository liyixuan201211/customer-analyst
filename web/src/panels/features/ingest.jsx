import React, { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Btn, Input, Select, Empty, Tag } from '../ui.jsx';

export default function IngestPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { cfg: 'Ingress config', token: 'Token', save: 'Save', url: 'Callback URL', test: 'Test with sample', customer: 'Customer' }
    : { cfg: '消息直连配置', token: '令牌', save: '保存', url: '回调地址', test: '用示例测试', customer: '客户' };
  const [cfg, setCfg] = useState({}); const [show, setShow] = useState(false);
  useEffect(() => { api.get('/ingest/config').then(setCfg); }, []);
  const save = async () => { await api.post('/ingest/config', { token: cfg.token || '' }); alert('已保存'); };
  const test = async () => {
    // 先取一个客户
    const c = await api.get('/customers'); if (!c.length) return alert('先建客户');
    const r = await api.post('/ingest/message', { token: cfg.token || '', customer_name: c[0].name, source: 'test', messages: [{ speaker: '客户', text: '你好，这是直连测试消息' }, { speaker: '我', text: '收到，稍后回复' }] });
    alert('已导入 ' + r.count + ' 条 → ' + r.customer_name);
  };
  return (
    <>
      <Section title={TXT.cfg}>
        <Card>
          <div className="flex items-center gap-2 mb-2"><span className="text-xs text-fg-2 w-20">{TXT.url}</span><code className="flex-1 text-xs text-brand">{cfg.url}</code><Btn size="xs" onClick={() => navigator.clipboard.writeText('http://127.0.0.1:3090' + cfg.url)}><Copy size={11} /> copy</Btn></div>
          <div className="flex items-center gap-2"><span className="text-xs text-fg-2 w-20">{TXT.token}</span><Input value={cfg.token || ''} onChange={e => setCfg({ ...cfg, token: e.target.value })} placeholder="secret" /><Btn size="xs" onClick={save}>{TXT.save}</Btn></div>
          <div className="text-[11px] text-fg-3 mt-2">POST {cfg.url}，Body: {"{token, customer_name, messages:[{speaker,text,time}]}"}。可在企业微信/钉钉/微信客服回调里转发。</div>
          <Btn variant="primary" className="mt-2" onClick={test}>{TXT.test}</Btn>
        </Card>
      </Section>
    </>
  );
}
