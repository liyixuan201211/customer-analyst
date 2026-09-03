import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Send } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Empty } from '../ui.jsx';

export default function IntegrationsPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { add: 'Add webhook', name: 'Name', url: 'URL', event: 'Event', apidoc: 'Open API', auth: 'Auth', test: 'Test' }
    : { add: '新增 Webhook', name: '名称', url: 'URL', event: '事件', apidoc: '开放 API', auth: '鉴权', test: '测试' };
  const [list, setList] = useState([]); const [info, setInfo] = useState(null);
  const [f, setF] = useState({ name: '', url: '', event: '*' }); const [showForm, setShowForm] = useState(false);
  const load = () => { api.get('/webhooks').then(setList); api.get('/api-info').then(setInfo); };
  useEffect(() => { load(); }, []);
  const test = async (id) => { const r = await api.post(`/webhooks/${id}/test`); alert(r.delivered ? 'Delivered ✓' : 'Failed ✗'); load(); };
  return (
    <>
      <Section title={TXT.add} right={<Btn variant="primary" onClick={() => setShowForm(!showForm)}><Plus size={12} className="inline" /> {TXT.add}</Btn>}>
        {showForm && (
          <Card className="mb-2 fade-in"><div className="grid grid-cols-2 gap-1.5">
            <Input placeholder={TXT.name} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /><Input placeholder={TXT.event} value={f.event} onChange={e => setF({ ...f, event: e.target.value })} />
            <Input placeholder={TXT.url} value={f.url} onChange={e => setF({ ...f, url: e.target.value })} className="col-span-2" />
          </div><Btn variant="primary" className="mt-2" onClick={async () => { await api.post('/webhooks', f); setF({ name: '', url: '', event: '*' }); setShowForm(false); load(); }}>{TXT.add}</Btn></Card>
        )}
        {list.length === 0 ? <Empty text="no webhooks" /> : list.map(w => (
          <Card key={w.id} className="mb-1.5 flex items-center gap-2"><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{w.name || w.url}</div><div className="text-[11px] text-fg-3 truncate">{w.url}</div></div><Tag color={w.enabled ? 'green' : 'gray'}>{w.event}</Tag><Btn size="xs" onClick={() => test(w.id)}><Send size={11} className="inline" /> {TXT.test}</Btn><Btn size="xs" variant="danger" onClick={async () => { await api.del(`/webhooks/${w.id}`); load(); }}><Trash2 size={11} /></Btn></Card>
        ))}
      </Section>
      {info && (
        <Section title={TXT.apidoc}>
          <Card className="text-[11px] text-fg-2 space-y-0.5">
            <div className="text-fg-3">{TXT.auth}：<code>Authorization: Bearer &lt;token&gt;</code> · base {info.base}</div>
            <div className="font-medium text-fg-2 mt-1">Endpoints</div>
            {info.endpoints.map((e, i) => <div key={i} className="font-mono">{e}</div>)}
          </Card>
        </Section>
      )}
    </>
  );
}
