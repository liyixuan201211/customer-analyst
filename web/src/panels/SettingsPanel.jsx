import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useStore } from '../store/index.js';
import { useI18n } from '../i18n.js';
import { Section, Card, Btn, Select, Input, Empty, Tag } from './ui.jsx';

const KINDS = [
  ['chat', 's_chat', '驱动智能体主循环与工具调用'], ['vision', 's_vision', '聊天截图转文字'],
  ['image', 's_image', '营销海报 / 示意图'], ['embedding', 's_embed', '知识库向量检索'],
];

export default function SettingsPanel() {
  const { models, loadModels, saveModels } = useStore();
  const { t } = useI18n();
  const [sel, setSel] = useState(null);
  const [health, setHealth] = useState(null);
  const [remote, setRemote] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { loadModels().then((m) => setSel(m.selected)); api.get('/health').then(setHealth); }, []);
  if (!models || !sel) return <Empty text={t('loading')} />;
  return (
    <>
      <Card className="mb-3 text-xs">
        <div className="flex items-center justify-between"><span>{t('s_provider')}：AI Ping</span><Tag color={health?.hasKey ? 'green' : 'red'}>{health?.hasKey ? t('s_key_ok') : t('s_key_no')}</Tag></div>
        <div className="text-[11px] text-fg-3 mt-1">{health?.provider} — {t('s_key_hint')}</div>
      </Card>
      {KINDS.map(([k, labelKey]) => (
        <Section key={k} title={t(labelKey)}>
          <Select value={models.registry[k].some((m) => m.id === sel[k]) ? sel[k] : '__custom'} onChange={(e) => { if (e.target.value !== '__custom') setSel({ ...sel, [k]: e.target.value }); }}>
            {models.registry[k].map((m) => <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>)}
            <option value="__custom">{t('s_custom')}：{models.registry[k].some((m) => m.id === sel[k]) ? t('s_custom_ph') : sel[k]}</option>
          </Select>
          <Input list="remote-models" placeholder={t('s_custom_ph')} value={sel[k]} onChange={(e) => setSel({ ...sel, [k]: e.target.value })} className="mt-1" />
        </Section>
      ))}
      <Section title={t('s_thinking')}>
        <Select value={sel.thinking === false ? 'off' : sel.thinking === true ? 'on' : 'auto'} onChange={(e) => setSel({ ...sel, thinking: e.target.value === 'auto' ? undefined : e.target.value === 'on' })}>
          <option value="auto">{t('s_auto')}</option><option value="on">{t('s_on')}</option><option value="off">{t('s_off')}</option>
        </Select>
      </Section>
      <div className="flex gap-1.5 items-center">
        <Btn variant="primary" onClick={async () => { await saveModels(sel); setMsg(t('s_saved')); setTimeout(() => setMsg(''), 1500); }}>{t('s_save')}</Btn>
        <Btn onClick={async () => { const m = await api.get('/models?remote=1'); setRemote(m.remote); }}>{t('s_pull')}</Btn>
        <span className="text-[11px] text-fg-3">{msg}</span>
      </div>
      {Array.isArray(remote) && <datalist id="remote-models">{remote.map((id) => <option key={id} value={id} />)}</datalist>}
      {remote && <Card className="mt-3 text-[11px] text-fg-2 max-h-60 overflow-y-auto">{Array.isArray(remote) ? <>{t('s_models')}：{remote.length}<div className="mt-1 flex flex-wrap gap-1">{remote.map((id) => <Tag key={id}>{id}</Tag>)}</div></> : <span className="text-danger">{remote.error}</span>}</Card>}
    </>
  );
}
