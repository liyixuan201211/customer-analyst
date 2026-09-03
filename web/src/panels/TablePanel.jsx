import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n.js';
import { Download, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useStore } from '../store/index.js';
import { Section, Card, DataTable, Empty, List, Btn, Tag } from './ui.jsx';

export default function TablePanel({ tableId, talkGuide }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [all, setAll] = useState([]);
  const { showPanel, panelBack } = useStore();
  useEffect(() => { if (tableId) api.get(`/tables/${tableId}`).then(setData); else api.get('/tables').then(setAll); }, [tableId]);

  if (!tableId) return all.length ? all.map((x) => <Card key={x.id} className="mb-1.5 cursor-pointer hover:border-fg-3"><div onClick={() => showPanel({ view: 'table', table_id: x.id })}><div className="text-sm">{x.title}</div><div className="text-[11px] text-fg-3">{x.rows.length} {t('t_rows')}</div></div></Card>) : <Empty text={t('t_none')} />;
  if (!data) return <Empty text={t('t_load')} />;
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{data.title}</div>
        <div className="flex gap-1">
          <a href={`/api/tables/${data.id}/csv`} className="rounded-md bg-elev border border-line-2 hover:bg-bg-2 px-2 py-1 text-xs flex items-center gap-1"><Download size={12} />CSV</a>
          <Btn variant="danger" onClick={async () => { if (confirm(t('delete') + '?')) { await api.del(`/tables/${data.id}`); panelBack(); } }}><Trash2 size={12} /></Btn>
        </div>
      </div>
      <DataTable columns={data.columns} rows={data.rows} />
      <div className="text-[11px] text-fg-3 mt-1 mb-4">{data.rows.length} {t('t_rows')} · {new Date(data.created_at).toLocaleString('zh-CN')}</div>
      {talkGuide && <TalkGuide g={talkGuide} />}
    </>
  );
}

export function TalkGuide({ g }) {
  const { t } = useI18n();
  return (
    <>
      <Section title={t('t_guide')}>
        <Card className="mb-2"><div className="text-[11px] text-fg-3 mb-0.5">{t('t_tone')}</div><div className="text-xs text-fg">{g.tone}</div></Card>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Card><div className="text-[11px] text-ok font-medium mb-1">{t('t_do')}</div><List items={g.do} icon="✓" /></Card>
          <Card><div className="text-[11px] text-danger font-medium mb-1">{t('t_dont')}</div><List items={g.dont} icon="✗" /></Card>
        </div>
      </Section>
      <Section title={t('t_openers')}><Card><List items={g.openers} icon="💬" /></Card></Section>
      <Section title={t('t_objections')}><Card className="space-y-2">{g.objection_handling?.map((o, i) => <div key={i}><div className="text-xs font-medium text-fg">Q: {o.objection}</div><div className="text-xs text-fg-2 mt-0.5">A: {o.response}</div></div>)}</Card></Section>
      <Section title={t('t_closing')}><Card><List items={g.closing} icon="→" /></Card></Section>
      <Section title={t('t_scripts')}><Card className="space-y-2">{g.scripts?.map((s, i) => <div key={i}><Tag color="blue">{s.scene}</Tag><div className="text-xs text-fg-2 mt-1 whitespace-pre-wrap">{s.script}</div></div>)}</Card></Section>
    </>
  );
}
