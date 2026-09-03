import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Copy } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Tag, Btn, Input, Textarea, Select, Empty } from '../ui.jsx';

const CATS = ['报价', '催单', '异议', '回访', '新品', '节日'];

export default function ScriptsPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const TXT = Z ? { add: 'Add script', cat: 'Category', scene: 'Scene', content: 'Content', search: 'Search…', empty: 'No scripts', copy: 'Copied' }
    : { add: '新增话术', cat: '分类', scene: '场景', content: '内容', search: '搜索…', empty: '暂无话术', copy: '已复制' };
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [f, setF] = useState({ title: '', category: '报价', scene: '', content: '', tags: '' });
  const [showForm, setShowForm] = useState(false);
  const load = () => api.get('/scripts' + (q ? '?q=' + encodeURIComponent(q) : '') + (cat ? (q ? '&' : '?') + 'category=' + cat : '')).then(setList);
  useEffect(() => { load(); }, [q, cat]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = async () => { if (!f.title || !f.content) return; await api.post('/scripts', { ...f, tags: f.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean) }); setF({ title: '', category: '报价', scene: '', content: '', tags: '' }); setShowForm(false); load(); };
  const copy = (c) => navigator.clipboard.writeText(c.content);
  return (
    <>
      <Section title={TXT.add} right={<div className="flex gap-1"><input value={q} onChange={e => setQ(e.target.value)} placeholder={TXT.search} className="w-28 rounded-lg border border-line-2 bg-bg px-2 py-1 text-xs outline-none focus:border-brand/60" /><Btn variant="primary" onClick={() => setShowForm(!showForm)}><Plus size={12} className="inline" /> {TXT.add}</Btn></div>}>
        {showForm && (
          <Card className="mb-2 fade-in"><div className="grid grid-cols-2 gap-1.5">
            <Input placeholder="标题" value={f.title} onChange={set('title')} /><Input placeholder={TXT.scene} value={f.scene} onChange={set('scene')} />
            <Select value={f.category} onChange={set('category')}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</Select><Input placeholder="标签（逗号分隔）" value={f.tags} onChange={set('tags')} />
            <Textarea rows={3} placeholder={TXT.content} value={f.content} onChange={set('content')} className="col-span-2" />
          </div><div className="flex gap-1.5 mt-2"><Btn variant="primary" onClick={create}>{TXT.add}</Btn><Btn onClick={() => setShowForm(false)}>{t('cancel')}</Btn></div></Card>
        )}
        <div className="flex gap-1 mb-2 flex-wrap">{CATS.map(c => <button key={c} onClick={() => setCat(cat === c ? '' : c)} className={`px-2 py-1 text-[11px] rounded-lg ${cat === c ? 'bg-brand-soft text-brand' : 'text-fg-2 hover:bg-bg-3'}`}>{c}</button>)}</div>
        {list.length === 0 ? <Empty text={TXT.empty} /> : list.map(s => (
          <Card key={s.id} className="mb-1.5"><div className="flex items-center gap-2"><Tag color="indigo">{s.category}</Tag><span className="text-sm font-medium flex-1 truncate">{s.title}</span>{s.scene && <span className="text-[11px] text-fg-3">{s.scene}</span>}<Btn size="xs" onClick={() => copy(s)}><Copy size={11} className="inline" /> {TXT.copy}</Btn><Btn size="xs" variant="danger" onClick={async () => { await api.del(`/scripts/${s.id}`); load(); }}><Trash2 size={11} /></Btn></div><div className="text-xs text-fg-2 mt-1 pl-2 whitespace-pre-wrap">{s.content}</div></Card>
        ))}
      </Section>
    </>
  );
}
