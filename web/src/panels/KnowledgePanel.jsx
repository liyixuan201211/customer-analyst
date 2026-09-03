import React, { useEffect, useState } from 'react';
import { Trash2, Upload, Search } from 'lucide-react';
import { api, readFileAsText } from '../lib/api.js';
import { useI18n } from '../i18n.js';
import { Section, Card, Btn, Input, Textarea, Empty, Tag } from './ui.jsx';

export default function KnowledgePanel({ hits: initHits }) {
  const { t } = useI18n();
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState(initHits || null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = () => api.get('/kb').then(setDocs);
  useEffect(() => { load(); }, []);
  const add = async (title, body) => {
    setBusy(true); setMsg(t('kb_ingest') + '…');
    try { const r = await api.post('/kb', { title, text: body }); setMsg(`${r.chunks} ${t('t_rows')}` + (r.embedded ? '' : ` (${t('kb_none')})`)); setTitle(''); setText(''); load(); } catch (e) { setMsg(t('err') + '：' + e.message); } finally { setBusy(false); }
  };
  const search = async () => { if (!q.trim()) return; setBusy(true); try { setHits(await api.get(`/kb/search?q=${encodeURIComponent(q)}`)); } finally { setBusy(false); } };
  return (
    <>
      <Section title={t('kb_search')} right={<input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder={t('kb_ph')} className="w-40 rounded-lg border border-line-2 bg-bg px-2 py-1 text-xs outline-none focus:border-brand/60" />}>
        <div className="flex gap-1.5 mt-2"><Btn variant="primary" disabled={busy || !q.trim()} onClick={search}><Search size={12} /> {t('kb_search')}</Btn></div>
        {hits && (hits.length ? hits.map((h) => <Card key={h.id} className="mt-1.5"><div className="flex justify-between"><Tag color="blue">{h.title}</Tag><span className="text-[11px] text-fg-3">{h.score}</span></div><div className="text-xs text-fg-2 mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">{h.content}</div></Card>) : <Empty text={t('kb_no')} />)}
      </Section>
      <Section title={t('kb_add')}>
        <Card>
          <Input placeholder={t('kb_title')} value={title} onChange={(e) => setTitle(e.target.value)} className="mb-1.5" />
          <Textarea rows={5} placeholder={t('kb_body')} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex gap-1.5 mt-2 items-center">
            <Btn variant="primary" disabled={busy || !title.trim() || !text.trim()} onClick={() => add(title, text)}>{t('kb_ingest')}</Btn>
            <label className="rounded-md bg-elev border border-line-2 hover:bg-bg-2 px-2.5 py-1.5 text-xs cursor-pointer flex items-center gap-1"><Upload size={12} />{t('kb_upload')}<input hidden type="file" accept=".txt,.md,.csv,.json,.log" multiple onChange={async (e) => { for (const f of e.target.files) await add(f.name, await readFileAsText(f)); e.target.value = ''; }} /></label>
            <span className="text-[11px] text-fg-3">{msg}</span>
          </div>
        </Card>
      </Section>
      <Section title={`${t('kb_docs')} (${docs.length})`}>
        {docs.length === 0 ? <Empty text={t('kb_none')} /> : docs.map((d) => <Card key={d.id} className="mb-1.5 flex items-center justify-between"><div><div className="text-sm">{d.title}</div><div className="text-[11px] text-fg-3">{d.chunk_count} {t('t_rows')} · {d.size} · {new Date(d.created_at).toLocaleDateString('zh-CN')}</div></div><button onClick={async () => { if (confirm(t('kb_del') + '?')) { await api.del(`/kb/${d.id}`); load(); } }} className="text-fg-3 hover:text-danger"><Trash2 size={13} /></button></Card>)}
      </Section>
    </>
  );
}
