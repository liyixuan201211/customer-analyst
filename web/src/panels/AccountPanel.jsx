import React, { useState } from 'react';
import { useStore } from '../store/index.js';
import { useI18n, LOCALES } from '../i18n.js';
import { Section, Card, Btn, Input, Select, Tag } from './ui.jsx';

export default function AccountPanel() {
  const { user, updateMe } = useStore();
  const { t, locale, setLocale, isFull } = useI18n();
  const [name, setName] = useState(user?.display_name || '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const save = async () => {
    setBusy(true); setMsg('');
    try {
      const patch = { display_name: name || user.display_name, locale };
      if (pw) { if (pw.length < 4) { setMsg(t('err') + ': >4'); setBusy(false); return; } if (pw !== pw2) { setMsg('密码不一致'); setBusy(false); return; } patch.password = pw; }
      await updateMe(patch); await useStore.setState({ user: { ...user, display_name: patch.display_name } });
      setMsg(t('s_saved')); setPw(''); setPw2('');
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <Section title={t('u_settings')}>
        <Card className="space-y-2">
          <div><div className="text-[11px] text-fg-3 mb-0.5">{t('login_user')}</div><Input value={user.username} disabled /></div>
          <div><div className="text-[11px] text-fg-3 mb-0.5">{t('login_name')}</div><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><div className="text-[11px] text-fg-3 mb-0.5">{t('u_language')}</div>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}{l.code === 'en-US' || l.code === 'zh-CN' ? '' : ' (beta)'}</option>)}
            </Select>
          </div>
          <div className="flex items-center gap-1.5"><Tag color={user.role === 'admin' ? 'indigo' : 'gray'}>{user.role === 'admin' ? t('u_role_admin') : t('u_role_member')}</Tag>{!isFull && <span className="text-[11px] text-fg-3">English fallback</span>}</div>
          <div className="border-t border-line pt-2"><div className="text-[11px] text-fg-3 mb-0.5">{t('login_pass')}（修改密码）</div>
            <div className="grid grid-cols-2 gap-1.5"><Input type="password" placeholder="New" value={pw} onChange={(e) => setPw(e.target.value)} /><Input type="password" placeholder="Repeat" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          </div>
          <div className="flex gap-1.5 items-center"><Btn variant="primary" disabled={busy} onClick={save}>{t('save')}</Btn><span className="text-[11px] text-fg-3">{msg}</span></div>
        </Card>
      </Section>
    </>
  );
}
