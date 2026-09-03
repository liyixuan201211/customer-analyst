import React, { useEffect, useState } from 'react';
import { Trash2, Upload, Search, Download, Send } from 'lucide-react';
import { api, readFileAsDataURL, readFileAsText } from '../lib/api.js';
import { useStore } from '../store/index.js';
import { useI18n } from '../i18n.js';
import { FollowupMessage } from './FollowupPanel.jsx';
import { LoyaltyRadar } from '../components/charts.jsx';
import { Section, Card, Tag, Btn, Input, Textarea, Score, KV, List, Empty, levelColor } from './ui.jsx';

export function CustomersList() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const showPanel = useStore((s) => s.showPanel);
  const { t, locale } = useI18n();
  const load = () => api.get('/customers' + (q ? `?q=${encodeURIComponent(q)}` : '')).then(setList);
  useEffect(() => { load(); }, [q]);
  return (
    <>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1"><Search size={13} className="absolute left-2 top-2 text-fg-3" /><Input placeholder={t('search_customer')} value={q} onChange={(e) => setQ(e.target.value)} className="pl-6" /></div>
        <a href={`/api/report.csv?locale=${encodeURIComponent(locale)}`} className="rounded-lg border border-line-2 bg-elev hover:bg-bg-3 px-2.5 py-1.5 text-xs flex items-center gap-1 text-fg" style={{ backgroundImage: 'none' }}><Download size={12} /> {t('h_export_all')}</a>
      </div>
      <div className="flex gap-2 mb-3">
        <Input placeholder={t('newly_created')} value={name} onChange={(e) => setName(e.target.value)} />
        <Btn variant="primary" disabled={!name.trim()} onClick={async () => { const c = await api.post('/customers', { name: name.trim() }); setName(''); showPanel({ view: 'customer', customer_id: c.id }); }}>{t('add')}</Btn>
      </div>
      {list.length === 0 ? <Empty text={t('no_chat')} /> : list.map((c) => (
        <Card key={c.id} className="mb-1.5 cursor-pointer hover:border-fg-3">
          <div onClick={() => showPanel({ view: 'customer', customer_id: c.id })}>
            <div className="flex items-center justify-between"><div className="text-sm font-medium">{c.name}</div>{c.loyalty ? <Tag color={levelColor(c.loyalty.level)}>{c.loyalty.score} · {c.loyalty.level}</Tag> : <Tag>{t('h_not_analyzed')}</Tag>}</div>
            <div className="text-[11px] text-fg-3 mt-0.5">{c.company || ''} {c.tags?.slice(0, 4).map((t) => <Tag key={t} color="indigo">{t}</Tag>)}</div>
          </div>
        </Card>
      ))}
    </>
  );
}

export default function CustomerPanel({ customerId, tab: initTab }) {
  const [c, setC] = useState(null);
  const [tab, setTab] = useState(initTab || 'profile');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const { showPanel, send, streaming } = useStore();
  const { t, locale } = useI18n();
  const load = () => api.get(`/customers/${customerId}`).then(setC).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [customerId]);
  useEffect(() => { if (initTab) setTab(initTab); }, [initTab]);
  if (err) return <Empty text={err} />;
  if (!c) return <Empty text={t('loading')} />;

  const run = async (kind) => {
    setBusy(kind); setErr('');
    try {
      if (kind === 'profile') await api.post(`/customers/${c.id}/profile`);
      if (kind === 'loyalty') await api.post(`/customers/${c.id}/loyalty`);
      if (kind === 'table') { const r = await api.post(`/customers/${c.id}/table`, {}); showPanel({ view: 'table', table_id: r.table.id, customer_id: c.id, talk_guide: r.talk_guide }); return; }
      await load();
      setTab(kind);
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const rfmTag = (c.tags || []).find((g) => ['重要价值', '重要发展', '重要保持', '重要挽留', '一般价值', '一般发展', '一般保持', '一般挽留'].includes(g));
  const tabs = [
    ['profile', t('tab_profile')], ['loyalty', t('tab_loyalty')], ['records', `${t('tab_records')}(${c.records.length})`],
    ['rfm', t('rfm_title')], ['followup', t('fu_title')], ['comments', `${t('tab_comments')}(${c.comments?.length || 0})`], ['tables', `${t('tab_tables')}(${c.tables.length})`], ['edit', t('tab_edit')],
  ];
  return (
    <>
      <Card className="mb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-semibold">{c.name}</div>
            <div className="text-[11px] text-fg-3">{[c.company, c.phone].filter(Boolean).join(' · ') || '—'}{c.owner ? ` · ${c.owner}` : ''}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {c.loyalty && <Tag color={levelColor(c.loyalty.level)}>{c.loyalty.score} · {c.loyalty.level}</Tag>}
            {rfmTag && <Tag color="indigo">{t('rfm_title')}：{rfmTag}</Tag>}
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">{c.tags?.map((t) => <Tag key={t} color="indigo">{t}</Tag>)}</div>
        {c.profile?.summary && <div className="text-xs text-fg-2 mt-2 leading-relaxed">{c.profile.summary}</div>}
        {c.assignments?.length > 0 && <div className="text-[11px] text-fg-3 mt-1.5">{t('st_assign')}：{c.assignments.map((a) => a.staff_name).join('、')}</div>}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Btn onClick={() => run('profile')} disabled={!!busy || !c.records.length}>{busy === 'profile' ? '…' : c.profile ? t('refresh_profile') : t('gen_profile')}</Btn>
          <Btn onClick={() => run('loyalty')} disabled={!!busy || !c.records.length}>{busy === 'loyalty' ? '…' : c.loyalty ? t('refresh_loyalty') : t('gen_loyalty')}</Btn>
          <Btn onClick={() => run('table')} disabled={!!busy || !c.records.length}>{busy === 'table' ? '…' : t('table_scripts')}</Btn>
          <Btn onClick={() => showPanel({ view: 'followups', tab: 'today', customer_id: c.id, message: true })}>{t('fu_generate')}</Btn>
          <a href={`/api/customers/${c.id}/report.csv?locale=${encodeURIComponent(locale)}`} className="rounded-md bg-elev border border-line-2 hover:bg-bg-3 px-2.5 py-1.5 text-xs flex items-center gap-1.5 text-fg"><Download size={12} /> {t('export_report')}</a>
          <a href={`/api/customers/${c.id}/report.xlsx?locale=${encodeURIComponent(locale)}`} className="rounded-md bg-elev border border-line-2 hover:bg-bg-3 px-2.5 py-1.5 text-xs flex items-center gap-1.5 text-fg">XLSX</a>
          <Btn variant="ghost" disabled={streaming} onClick={() => send(`针对客户「${c.name}」（ID: ${c.id}），请给出当前最应该采取的 3 个动作及理由。`)}>{t('ask_agent')}</Btn>
        </div>
        {!c.records.length && <div className="text-[11px] text-warn mt-2">{t('no_records')}</div>}
        {err && <div className="text-[11px] text-danger mt-2">{err}</div>}
      </Card>

      <div className="flex gap-1 mb-3 border-b border-line overflow-x-auto">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-1.5 text-xs whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-fg font-medium' : 'border-transparent text-fg-3 hover:text-fg'}`}>{l}</button>)}
      </div>

      {tab === 'profile' && <Profile p={c.profile} />}
      {tab === 'loyalty' && <Loyalty l={c.loyalty} />}
      {tab === 'rfm' && <RfmView customer={c} />}
      {tab === 'followup' && <CustomerFollowups customer={c} />}
      {tab === 'records' && <Records c={c} reload={load} />}
      {tab === 'comments' && <Comments c={c} reload={load} />}
      {tab === 'tables' && (c.tables.length ? c.tables.map((t) => <Card key={t.id} className="mb-1.5 cursor-pointer hover:border-fg-3"><div onClick={() => showPanel({ view: 'table', table_id: t.id, customer_id: c.id })}><div className="text-sm">{t.title}</div><div className="text-[11px] text-fg-3">{t.rows.length} {t('t_rows')} · {new Date(t.created_at).toLocaleString('zh-CN')}</div></div></Card>) : <Empty text={t('t_none')} />)}
      {tab === 'edit' && <EditCustomer c={c} reload={load} />}
    </>
  );
}

function RfmView({ customer }) {
  const { t } = useI18n();
  const [rfm, setRfm] = useState(null);
  const [busy, setBusy] = useState(false);
  const compute = async () => { setBusy(true); try { setRfm(await api.post(`/customers/${customer.id}/rfm`)); } finally { setBusy(false); } };
  useEffect(() => { compute(); }, []);
  if (!rfm) return <Empty text={busy ? '…' : t('rfm_analyze')} />;
  const dims = [['R', rfm.r], ['F', rfm.f], ['M', rfm.m]].map(([name, score]) => ({ dim: name, score: score * 20 }));
  return (
    <>
      <Card className="mb-3 text-center">
        <div className="text-[11px] text-fg-3">{t('rfm_segment')}</div>
        <div className="text-2xl font-bold text-brand mt-0.5">{rfm.segment}</div>
        <div className="text-xs text-fg-2 mt-1">{rfm.segment_desc}</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <MiniStat label={t('rfm_r')} value={rfm.r + '/5'} sub={rfm.recency_days + 'd'} />
          <MiniStat label={t('rfm_f')} value={rfm.f + '/5'} sub={rfm.frequency + ' 次'} />
          <MiniStat label={t('rfm_m')} value={rfm.m + '/5'} sub={rfm.monetary + ' 分'} />
        </div>
      </Card>
      <Section title={t('rfm_loyalty_dims')}><Card><LoyaltyRadar dimensions={dims} /></Card></Section>
      <Btn variant="ghost" onClick={compute} className="w-full mt-1">{busy ? '…' : t('refresh')}</Btn>
    </>
  );
}
function MiniStat({ label, value, sub }) {
  return <div className="rounded-lg bg-bg-2 p-2"><div className="text-[10px] text-fg-3">{label}</div><div className="text-base font-semibold tabular-nums">{value}</div><div className="text-[10px] text-fg-3">{sub}</div></div>;
}

function CustomerFollowups({ customer }) {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [openMsg, setOpenMsg] = useState(false);
  const load = () => api.get(`/followups?customer_id=${customer.id}`).then(setList);
  useEffect(() => { load(); }, []);
  return (
    <>
      <Btn variant="primary" className="mb-2" onClick={() => setOpenMsg(!openMsg)}>{t('fu_gen_btn')}</Btn>
      {openMsg && <FollowupMessage customerId={customer.id} />}
      {list.length === 0 ? <Empty text={t('fu_empty')} /> : list.map((fu) => (
        <Card key={fu.id} className="mb-1.5">
          <div className="flex items-center gap-2">
            <Tag color={fu.status === 'done' ? 'green' : 'blue'}>{t('fu_type_' + fu.type)}</Tag>
            <span className="text-[13px] flex-1 min-w-0 truncate">{fu.subject || '-'}</span>
            {fu.due_at && <span className="text-[11px] text-fg-3">{new Date(fu.due_at).toLocaleDateString('zh-CN')}</span>}
            {fu.status !== 'done' ? <Btn size="xs" variant="primary" onClick={async () => { await api.post(`/followups/${fu.id}/complete`); load(); }}>{t('fu_complete')}</Btn> : <Tag color="green">{t('fu_done')}</Tag>}
          </div>
          {fu.note && <div className="text-xs text-fg-2 mt-1">{fu.note}</div>}
        </Card>
      ))}
    </>
  );
}

function Profile({ p }) {
  const { t } = useI18n();
  if (!p) return <Empty text={t('a_not_generated')} />;
  return (
    <>
      <Section title={t('a_basic')}><Card>{Object.entries(p.basic || {}).map(([k, v]) => <KV key={k} k={{ role: '决策角色', industry: '行业', company_size: '公司规模', region: '地区', budget_level: '预算水平' }[k] || k} v={v} />)}</Card></Section>
      <Section title={t('a_personality')}><Card>
        <div className="flex items-center gap-2 mb-1"><Tag color="indigo">DISC · {p.personality?.type}</Tag></div>
        <div className="flex flex-wrap gap-1 mb-1.5">{p.personality?.traits?.map((t) => <Tag key={t}>{t}</Tag>)}</div>
        <div className="text-xs text-fg-2">{p.personality?.communication_style}</div>
      </Card></Section>
      <Section title={t('a_needs')}><Card className="space-y-2">
        <div><div className="text-[11px] text-fg-3 mb-0.5">{t('a_explicit')}</div><List items={p.needs?.explicit} icon="✓" /></div>
        <div><div className="text-[11px] text-fg-3 mb-0.5">{t('a_implicit')}</div><List items={p.needs?.implicit} icon="◦" /></div>
        <div><div className="text-[11px] text-fg-3 mb-0.5">{t('a_pain')}</div><List items={p.needs?.pain_points} icon="!" color="text-danger" /></div>
      </Card></Section>
      <Section title={t('a_decision')}><Card>
        <div className="flex gap-1.5 mb-1.5"><Tag color="blue">{t('a_stage')} · {p.decision?.stage}</Tag><Tag color={levelColor(p.decision?.urgency)}>{t('a_urgency')} · {p.decision?.urgency}</Tag></div>
        <KV k={t('a_drivers')} v={p.decision?.drivers} /><KV k={t('a_concerns')} v={p.decision?.concerns} />
      </Card></Section>
      <Section title={t('a_pricesens')}><Card><div className="flex items-center gap-2"><Tag color={p.price_sensitivity?.level === '高' ? 'red' : p.price_sensitivity?.level === '低' ? 'green' : 'amber'}>{p.price_sensitivity?.level}</Tag><span className="text-xs text-fg-2">{p.price_sensitivity?.evidence}</span></div></Card></Section>
      <Section title={t('a_behavior')}><Card>
        <KV k={t('a_resp')} v={p.behavior?.response_speed} /><KV k={t('a_hours')} v={p.behavior?.active_hours} /><KV k={t('a_channel')} v={p.behavior?.preferred_channel} />
        {p.behavior?.engagement != null && <div className="mt-1"><div className="text-[11px] text-fg-3">{t('a_engage')}</div><Score value={+p.behavior.engagement || 0} /></div>}
      </Card></Section>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card><div className="text-[11px] text-danger font-medium mb-1">{t('a_risks')}</div><List items={p.risks} icon="⚠" /></Card>
        <Card><div className="text-[11px] text-ok font-medium mb-1">机会</div><List items={p.opportunities} icon="★" /></Card>
      </div>
      <Section title={t('a_evidence')}><Card>{p.evidence?.map((e, i) => <div key={i} className="text-xs text-fg-2 border-l-2 border-line pl-2 mb-1.5 italic">“{e}”</div>)}</Card></Section>
    </>
  );
}

function Loyalty({ l }) {
  const { t } = useI18n();
  if (!l) return <Empty text={t('a_unknown')} />;
  return (
    <>
      <Card className="mb-3 text-center">
        <div className="text-4xl font-bold tabular-nums">{l.score}</div>
        <div className="mt-1"><Tag color={levelColor(l.level)}>{l.level}</Tag> <Tag color="blue">{l.lifecycle_stage}</Tag> <Tag color={levelColor(l.trend)}>趋势 {l.trend}</Tag></div>
        {l.analyzed_at && <div className="text-[11px] text-fg-3 mt-1">{new Date(l.analyzed_at).toLocaleString('zh-CN')}</div>}
      </Card>
      <Section title={t('a_dimensions')}><Card className="space-y-2">{l.dimensions?.map((d) => <div key={d.name}><div className="flex justify-between text-xs mb-0.5"><span className="font-medium">{d.name}</span></div><Score value={d.score} /><div className="text-[11px] text-fg-3 mt-0.5">{d.evidence}</div></div>)}</Card></Section>
      <Section title={t('a_churn')}><Card>
        <div className="flex items-center gap-2 mb-1"><Tag color={levelColor(l.churn_risk?.level)}>{t('a_churn')} {l.churn_risk?.level}</Tag>{l.churn_risk?.probability != null && <span className="text-xs text-fg-2">概率 {Math.round(l.churn_risk.probability * 100)}%</span>}</div>
        <List items={l.churn_risk?.signals} icon="⚠" color="text-danger" />
      </Card></Section>
      <Section title={t('a_retention')}><Card><List items={l.retention_actions} icon="→" /></Card></Section>
      <Section title={t('a_next')}><Card><KV k={t('a_timing')} v={l.next_contact?.timing} /><KV k={t('a_topic')} v={l.next_contact?.topic} /><KV k={t('a_via')} v={l.next_contact?.channel} /></Card></Section>
    </>
  );
}

function Comments({ c, reload }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const add = async () => {
    if (!text.trim() || busy) return; setBusy(true); setMsg('');
    try { await api.post('/comments', { customer_id: c.id, text: text.trim() }); setText(''); await reload(); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <Card className="mb-3">
        <Textarea rows={2} placeholder={t('comment_placeholder')} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-1.5 mt-2 items-center"><Btn variant="primary" disabled={busy || !text.trim()} onClick={add}><Send size={12} className="inline" /> {t('comment_send')}</Btn><span className="text-[11px] text-fg-3">{msg}</span></div>
      </Card>
      <div className="space-y-1.5">
        {(c.comments || []).length === 0 ? <Empty text={t('comment_empty')} /> : c.comments.map((cm) => (
          <Card key={cm.id} className="flex gap-2">
            <div className="w-6 h-6 rounded-full grid place-items-center text-brand-fg text-[10px] font-semibold shrink-0" style={{ background: 'var(--brand)' }}>{(cm.user_name || '?').slice(0, 1)}</div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="text-[12.5px] font-medium">{cm.user_name}</span><span className="text-[11px] text-fg-3">{new Date(cm.created_at).toLocaleString('zh-CN')}</span></div><div className="text-[13px] text-fg mt-1 whitespace-pre-wrap">{cm.text}</div></div>
          </Card>
        ))}
      </div>
    </>
  );
}

function Records({ c, reload }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const importText = async (t, file_name) => {
    setBusy(true); setMsg('');
    try { const r = await api.post('/import', { customer_id: c.id, text: t, file_name }); setMsg(`已导入 ${r.messages} 条消息`); setText(''); await reload(); } catch (e) { setMsg('失败：' + e.message); } finally { setBusy(false); }
  };
  const importImages = async (files) => {
    setBusy(true); setMsg('识别截图中…');
    try { const images = await Promise.all([...files].map(readFileAsDataURL)); const r = await api.post('/import', { customer_id: c.id, images, file_name: files[0]?.name }); setMsg(`已识别并导入 ${r.messages} 条消息`); await reload(); } catch (e) { setMsg('失败：' + e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <Card className="mb-3">
        <Textarea rows={4} placeholder="粘贴聊天记录文本…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-1.5 mt-2 items-center">
          <Btn variant="primary" disabled={busy || !text.trim()} onClick={() => importText(text)}>导入文本</Btn>
          <label className="rounded-md bg-elev border border-line-2 hover:bg-bg-2 px-2.5 py-1.5 text-xs cursor-pointer flex items-center gap-1"><Upload size={12} />截图<input hidden type="file" accept="image/*" multiple onChange={(e) => importImages(e.target.files)} /></label>
          <label className="rounded-md bg-elev border border-line-2 hover:bg-bg-2 px-2.5 py-1.5 text-xs cursor-pointer flex items-center gap-1"><Upload size={12} />文件<input hidden type="file" accept=".txt,.csv,.md,.log" onChange={async (e) => { const f = e.target.files[0]; if (f) importText(await readFileAsText(f), f.name); }} /></label>
          <span className="text-[11px] text-fg-3">{msg}</span>
        </div>
      </Card>
      {c.records.map((r) => (
        <Card key={r.id} className="mb-1.5">
          <div className="flex items-center justify-between mb-1"><div className="text-[11px] text-fg-3">{r.source === 'image' ? '截图' : '文本'} · {r.file_name || ''} · {r.parsed?.length || 0} 条 · {new Date(r.created_at).toLocaleString('zh-CN')}</div><button onClick={async () => { if (confirm('删除该记录？')) { await api.del(`/customers/${c.id}/records/${r.id}`); reload(); } }} className="text-fg-3 hover:text-danger"><Trash2 size={12} /></button></div>
          <details><summary className="text-xs cursor-pointer text-fg-2">{r.content.slice(0, 80)}…</summary><pre className="text-[11px] whitespace-pre-wrap mt-1 text-fg-2 max-h-64 overflow-y-auto">{r.content}</pre></details>
        </Card>
      ))}
    </>
  );
}

function EditCustomer({ c, reload }) {
  const [f, setF] = useState({ name: c.name, company: c.company || '', phone: c.phone || '', notes: c.notes || '', tags: (c.tags || []).join(', ') });
  const { showPanel } = useStore();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Card className="space-y-2">
      <div><div className="text-[11px] text-fg-3 mb-0.5">名称</div><Input value={f.name} onChange={set('name')} /></div>
      <div><div className="text-[11px] text-fg-3 mb-0.5">公司</div><Input value={f.company} onChange={set('company')} /></div>
      <div><div className="text-[11px] text-fg-3 mb-0.5">电话</div><Input value={f.phone} onChange={set('phone')} /></div>
      <div><div className="text-[11px] text-fg-3 mb-0.5">标签（逗号分隔）</div><Input value={f.tags} onChange={set('tags')} /></div>
      <div><div className="text-[11px] text-fg-3 mb-0.5">备注</div><Textarea rows={3} value={f.notes} onChange={set('notes')} /></div>
      <div className="flex gap-1.5">
        <Btn variant="primary" onClick={async () => { await api.patch(`/customers/${c.id}`, { ...f, tags: f.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean) }); reload(); }}>保存</Btn>
        <Btn variant="danger" onClick={async () => { if (confirm('删除客户及其所有记录？')) { await api.del(`/customers/${c.id}`); showPanel({ view: 'customers' }); } }}>删除客户</Btn>
      </div>
    </Card>
  );
}
