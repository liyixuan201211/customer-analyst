import React, { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Pencil, Users, Boxes, UserCog, BookOpen, Settings, LayoutDashboard, Sparkles, PanelLeftClose, Search, Sun, Moon, Activity, ChevronDown, LogOut, Globe, UserRound, CalendarCheck } from 'lucide-react';
import { useStore } from '../store/index.js';
import { useI18n, LOCALES } from '../i18n.js';
import { FeatureNav } from './FeatureNav.jsx';

const NAV = [
  { view: 'home', icon: LayoutDashboard, key: 'nav_overview' },
  { view: 'customers', icon: Users, key: 'nav_customers' },
  { view: 'followups', icon: CalendarCheck, key: 'nav_followups' },
  { view: 'inventory', icon: Boxes, key: 'nav_inventory' },
  { view: 'staff', icon: UserCog, key: 'nav_staff' },
  { view: 'activity', icon: Activity, key: 'nav_activity' },
  { view: 'knowledge', icon: BookOpen, key: 'nav_knowledge' },
  { view: 'settings', icon: Settings, key: 'nav_settings' },
];

export default function Sidebar() {
  const { conversations, currentId, openConversation, newConversation, deleteConversation, renameConversation, panel, showPanel, toggleLeft, theme, toggleTheme, user, logout, members, loadMembers } = useStore();
  const { t, locale, setLocale } = useI18n();
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => { const h = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const filtered = q ? conversations.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())) : conversations;
  const groups = groupByDate(filtered);
  const online = members.filter((m) => m.online).length;

  return (
    <>
      <div className="h-12 shrink-0 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand grid place-items-center text-brand-fg"><Sparkles size={15} /></div>
          <div className="font-semibold text-[14px] tracking-tight">{t('app_name')}</div>
        </div>
        <button onClick={toggleLeft} className="p-1.5 rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg" title={`⌘B ${t('collapse')}`}><PanelLeftClose size={16} /></button>
      </div>

      <div className="px-3 pb-2 space-y-2">
        <button onClick={newConversation} className="w-full flex items-center gap-2 rounded-xl bg-bg border border-line-2 px-3 py-2 text-[13px] font-medium hover:bg-bg-3 transition shadow-[var(--shadow)]">
          <Plus size={15} /> {t('new_chat')}
        </button>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-fg-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_chat')} className="w-full rounded-lg bg-bg-3 pl-7 pr-2 py-1.5 text-[12px] outline-none placeholder:text-fg-3 focus:ring-1 ring-brand/40" />
        </div>
      </div>

      <nav className="px-2 pb-2 grid grid-cols-4 gap-1">
        {NAV.map(({ view, icon: Icon, key }) => (
          <button key={view} onClick={() => showPanel({ view })} title={t(key)}
            className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10.5px] transition ${panel.view === view ? 'bg-brand-soft text-brand' : 'text-fg-2 hover:bg-bg-3'}`}>
            <Icon size={16} /> {t(key)}
          </button>
        ))}
      </nav>
      <div className="px-2 pb-1 text-[10px] text-fg-3">更多功能</div>
      <FeatureNav />

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 && <div className="text-xs text-fg-3 text-center mt-10">{t('no_chat')}</div>}
        {groups.map(([g, list]) => (
          <div key={g} className="mb-2">
            <div className="text-[11px] text-fg-3 px-2 py-1 font-medium">{t(g)}</div>
            {list.map((c) => (
              <div key={c.id} onClick={() => openConversation(c.id)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[13px] ${c.id === currentId ? 'bg-bg-3 text-fg' : 'text-fg-2 hover:bg-bg-3/60 hover:text-fg'}`}>
                <MessageSquare size={14} className="shrink-0 text-fg-3" />
                {editing === c.id ? (
                  <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onClick={(e) => e.stopPropagation()}
                    onBlur={() => { renameConversation(c.id, title || c.title); setEditing(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null); }}
                    className="flex-1 min-w-0 bg-bg border border-line-2 rounded px-1 text-[13px] outline-none" />
                ) : <span className="flex-1 truncate">{c.title}</span>}
                <span className="hidden group-hover:flex items-center gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); setEditing(c.id); setTitle(c.title); }} className="p-0.5 text-fg-3 hover:text-fg"><Pencil size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(t('delete') + '?')) deleteConversation(c.id); }} className="p-0.5 text-fg-3 hover:text-danger"><Trash2 size={12} /></button>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-line">
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[11px] text-fg-3 px-1 flex-1 truncate">{t('sidebar_footer')}</span>
          <button onClick={toggleTheme} className="p-1.5 rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg" title={t('toggle_theme')}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
        </div>
        {/* 用户菜单 */}
        <div ref={menuRef} className="relative">
          <button onClick={() => { setMenu(!menu); loadMembers(); }} className="w-full flex items-center gap-2 rounded-lg hover:bg-bg-3 px-2 py-1.5 transition">
            <div className="w-7 h-7 rounded-full grid place-items-center text-brand-fg text-[12px] font-semibold shrink-0" style={{ background: user?.avatar_color || '#4d6bfe' }}>{(user?.display_name || user?.username || '?').slice(0, 1).toUpperCase()}</div>
            <div className="flex-1 min-w-0 text-left"><div className="text-[12.5px] font-medium truncate">{user?.display_name || user?.username}</div><div className="text-[10.5px] text-fg-3 flex items-center gap-1">{user?.role === 'admin' ? t('u_role_admin') : t('u_role_member')}{online > 0 && <span className="text-ok">· {online} {t('u_online')}</span>}</div></div>
            <ChevronDown size={13} className={`text-fg-3 transition ${menu ? 'rotate-180' : ''}`} />
          </button>
          {menu && (
            <div className="absolute bottom-full left-0 mb-1 w-[240px] rounded-xl border border-line-2 bg-elev shadow-[var(--shadow)] p-1.5 z-40 fade-in">
              <div className="px-2 py-1.5 border-b border-line mb-1"><div className="text-[13px] font-medium truncate">{user?.display_name || user?.username}</div><div className="text-[11px] text-fg-3">{user?.username} · {user?.role}</div></div>
              <MenuRow icon={<Globe size={14} />} label={t('u_language')} sub={LOCALES.find(l => l.code === locale)?.label}>
                <div className="flex flex-wrap gap-1 p-1">{[...LOCALES].filter(l => l.code === 'zh-CN' || l.code === 'en-US').map(l => <LangBtn key={l.code} active={l.code === locale} onClick={() => { setLocale(l.code); }}>{l.flag} {l.label}</LangBtn>)}</div>
              </MenuRow>
              <MenuRow icon={<UserRound size={14} />} label={t('u_settings')} onClick={() => { showPanel({ view: 'account' }); setMenu(false); }} />
              <MenuRow icon={<Activity size={14} />} label={t('u_members')} onClick={() => { showPanel({ view: 'members' }); setMenu(false); }} />
              <button onClick={async () => { await logout(); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-[12.5px] text-danger rounded-lg hover:bg-bg-3"><LogOut size={14} /> {t('u_logout')}</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
const MenuRow = ({ icon, label, sub, onClick, children }) => (
  <div>
    {onClick ? <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 text-[12.5px] rounded-lg hover:bg-bg-3"><span className="text-fg-3">{icon}</span><span className="flex-1">{label}</span>{sub && <span className="text-[11px] text-fg-3">{sub}</span>}</button>
      : <div className="px-2 py-1.5 text-[12.5px]"><div className="flex items-center gap-2 text-fg"><span className="text-fg-3">{icon}</span>{label}</div>{children}</div>}
  </div>
);
const LangBtn = ({ active, onClick, children }) => <button onClick={onClick} className={`px-2 py-1 rounded-md text-[12px] ${active ? 'bg-brand-soft text-brand font-medium' : 'text-fg-2 hover:bg-bg-3'}`}>{children}</button>;

function groupByDate(list) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d1 = today.getTime(), d7 = d1 - 6 * 864e5, d30 = d1 - 29 * 864e5;
  const map = new Map();
  for (const c of list) {
    const t = c.updated_at;
    const g = t >= d1 ? 'group_today' : t >= d7 ? 'group_7d' : t >= d30 ? 'group_30d' : 'group_older';
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(c);
  }
  return [...map.entries()];
}
