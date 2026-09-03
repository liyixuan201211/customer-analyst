import React, { useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n.js';
import { Section, Card, Btn, Input, Empty, Tag } from './ui.jsx';

export default function WebPanel({ query, results: init, engine, error }) {
  const { t } = useI18n();
  const [q, setQ] = useState(query || '');
  const [r, setR] = useState({ results: init || [], engine, error });
  const [busy, setBusy] = useState(false);
  const search = async () => { if (!q.trim()) return; setBusy(true); try { setR(await api.get(`/search?q=${encodeURIComponent(q)}`)); } finally { setBusy(false); } };
  return (
    <>
      <div className="flex gap-1.5 mb-3"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder={t('web_ph')} /><Btn variant="primary" disabled={busy} onClick={search}><Search size={12} /></Btn></div>
      {r.engine && <div className="text-[11px] text-fg-3 mb-2">{t('web_engine')}：{r.engine} {r.error && <span className="text-danger">{r.error}</span>}</div>}
      {r.results?.length ? r.results.map((x, i) => (
        <Card key={i} className="mb-1.5">
          <a href={x.url} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline flex items-start gap-1">{x.title}<ExternalLink size={11} className="mt-1 shrink-0" /></a>
          <div className="text-[11px] text-fg-3 truncate">{x.url}</div>
          <div className="text-xs text-fg-2 mt-1">{x.snippet}</div>
        </Card>
      )) : <Empty text={t('web_no')} />}
    </>
  );
}
