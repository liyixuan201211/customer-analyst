import React, { useEffect, useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Btn, Select, Empty, Tag } from '../ui.jsx';

const STAGE_NAME = { profile: '画像', loyalty: '忠诚度', rfm: 'RFM', pricing: '定价', strategy: '策略' };
export default function MultiagentPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { pick: 'Select customer', product: 'Product (optional)', run: 'Run multi-agent analysis', prompt: 'Or ask the agent' }
    : { pick: '选择客户', product: '商品（可选）', run: '运行多智能体分析', prompt: '或让智能体执行' };
  const [custs, setCusts] = useState([]); const [prods, setProds] = useState([]);
  const [customer_id, setCid] = useState(''); const [product_id, setPid] = useState('');
  const [result, setResult] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/customers').then(setCusts); api.get('/products').then(setProds); }, []);
  const run = async () => { if (!customer_id) return; setBusy(true); try { setResult(await api.post('/multiagent/task', { customer_id, product_id: product_id || undefined })); } finally { setBusy(false); } };
  return (
    <>
      <Section title="Multi-agent">
        <div className="flex gap-1.5 mb-2"><Select value={customer_id} onChange={e => setCid(e.target.value)} className="flex-1"><option value="">{TXT.pick}</option>{custs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><Select value={product_id} onChange={e => setPid(e.target.value)} className="flex-1"><option value="">{TXT.product}</option>{prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select><Btn variant="primary" disabled={!customer_id || busy} onClick={run}><Loader2 size={12} className={`inline ${busy ? 'animate-spin' : 'hidden'}`} /> {TXT.run}</Btn></div>
        {result && (
          <Card className="space-y-1.5">
            <div className="text-sm font-medium">{result.customer} · {result.done}/{result.stages.length} 完成{result.failed ? ` · ${result.failed} 失败` : ''}</div>
            {result.stages.map(s => (
              <div key={s.name} className="flex items-center gap-2 text-xs"><span className="w-16 text-fg-2">{STAGE_NAME[s.name] || s.name}</span>{s.status === 'done' ? <Check size={13} className="text-ok" /> : s.status === 'running' ? <Loader2 size={13} className="animate-spin text-brand" /> : <X size={13} className="text-danger" />}<span className="text-fg-3 truncate">{s.status === 'done' ? (typeof s.data === 'object' ? Object.values(s.data)[0] : '') : s.status === 'error' ? s.data : ''}</span></div>
            ))}
          </Card>
        )}
        {!result && <Empty text={TXT.prompt + '：/api/multiagent/task'} />}
      </Section>
    </>
  );
}
