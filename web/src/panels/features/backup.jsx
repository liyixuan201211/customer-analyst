import React, { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Empty } from '../ui.jsx';

export default function BackupPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { create: 'Create backup', list: 'Backups', empty: 'No backups', restore: 'Restore', records: 'records', tables: 'tables' }
    : { create: '导出全量备份', list: '历史备份', empty: '暂无备份', restore: '恢复', records: '条', tables: '张表' };
  const [list, setList] = useState([]); const [busy, setBusy] = useState(false);
  const load = () => api.get('/backup/list').then(setList);
  useEffect(() => { load(); }, []);
  const create = async () => { setBusy(true); try { const r = await api.post('/backup'); alert(`已备份 ${r.tables} ${TXT.tables} / ${r.records} ${TXT.records}`); load(); } finally { setBusy(false); } };
  const restore = async (file) => { if (!confirm('恢复会覆盖现有数据，确认？')) return; const d = await api.get('/backup/download/' + file); const r = await api.post('/backup/restore', { data: d.data }); alert(`已恢复 ${r.restored} 条`); };
  return (
    <>
      <Section title="Backup" right={<Btn variant="primary" onClick={create} disabled={busy}><Download size={12} className="inline" /> {TXT.create}</Btn>}>
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(b => (
          <Card key={b.file} className="mb-1.5 flex items-center gap-2"><span className="text-sm flex-1 truncate">{b.file}</span><span className="text-[11px] text-fg-3">{new Date(b.at).toLocaleString('zh-CN')}</span><span className="text-[11px] text-fg-3">{(b.size / 1024).toFixed(0)}KB</span><a href={`/api/backup/download/${b.file}`} className="text-[11px] text-brand"><Download size={11} className="inline" /></a><Btn size="xs" variant="danger" onClick={() => restore(b.file)}>{TXT.restore}</Btn></Card>
        ))}
      </Section>
    </>
  );
}
