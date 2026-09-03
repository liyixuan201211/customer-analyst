import React, { useState } from 'react';
import { Sparkles, Globe, User, Lock, UserPlus } from 'lucide-react';
import { useStore } from '../store/index.js';
import { LOCALES, useI18n } from '../i18n.js';

export default function Login() {
  const { t, locale, setLocale } = useI18n();
  const { login, register } = useStore();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [display, setDisplay] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'login') await login(username.trim(), password);
      else await register(username.trim(), password, display.trim() || username.trim());
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-full flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand grid place-items-center text-brand-fg shadow-[var(--shadow)]"><Sparkles size={22} /></div>
          <div className="text-xl font-semibold mt-3 tracking-tight">{t('app_name')}</div>
          <div className="text-[12px] text-fg-3 mt-0.5">{t('app_sub')}</div>
        </div>

        <div className="rounded-2xl border border-line-2 bg-elev p-5 shadow-[var(--shadow)] fade-in">
          <div className="flex rounded-lg bg-bg-3 p-1 mb-4">
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(''); }} className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition ${mode === m ? 'bg-elev shadow-sm' : 'text-fg-3'}`}>
                {m === 'login' ? t('login_btn') : t('login_register')}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <Field icon={<User size={15} />} value={username} onChange={setUsername} placeholder={t('login_user')} />
            <Field icon={<Lock size={15} />} type={showPw ? 'text' : 'password'} value={password} onChange={setPassword} placeholder={t('login_pass')} onToggle={() => setShowPw(!showPw)} />
            {mode === 'register' && <Field icon={<UserPlus size={15} />} value={display} onChange={setDisplay} placeholder={t('login_name')} />}
            {err && <div className="text-[12px] text-danger">{err}</div>}
            <button type="submit" disabled={busy || !username || !password} className="w-full rounded-lg bg-brand text-brand-fg py-2 text-[14px] font-medium disabled:opacity-40 hover:opacity-90 transition">
              {busy ? '…' : mode === 'login' ? t('login_btn') : t('register_btn')}
            </button>
          </form>
          <div className="text-[11px] text-fg-3 text-center mt-3">{t('login_hint')}</div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          <Globe size={13} className="text-fg-3" />
          {LOCALES.map((l) => <button key={l.code} onClick={() => setLocale(l.code)} className={`px-1.5 py-0.5 text-[12px] rounded ${locale === l.code ? 'bg-brand-soft text-brand font-medium' : 'text-fg-3 hover:text-fg'}`}>{l.flag} {l.label.split(' ')[0] === l.label ? l.label.split(' ')[0] : l.label}</button>)}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, type = 'text', value, onChange, placeholder, onToggle }) {
  const id = 'f-' + placeholder;
  return (
    <div className="relative rounded-lg border border-line-2 bg-bg has-focus-within:border-brand/60">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3">{icon}</span>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent pl-9 pr-9 py-2.5 text-[14px] outline-none" autoComplete="off" />
      {type === 'password' && <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-fg-3 hover:text-fg">{type === 'password' ? '显示' : '隐藏'}</button>}
    </div>
  );
}
