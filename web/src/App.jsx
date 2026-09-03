import React, { useEffect, useState } from 'react';
import { useStore } from './store/index.js';
import Sidebar from './components/Sidebar.jsx';
import Chat from './components/Chat.jsx';
import RightPanel from './panels/RightPanel.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Login from './components/Login.jsx';

export default function App() {
  const { loadConversations, loadModels, bootstrap, user, leftOpen, rightOpen, toggleLeft, toggleRight, toggleTheme, loadMembers, loadActivity } = useStore();
  const panelView = useStore((s) => s.panel.view);
  const [booted, setBooted] = useState(false);
  useEffect(() => { (async () => {
    await bootstrap();
    try { await Promise.all([loadConversations(), loadModels()]); } catch {}
    setBooted(true);
  })(); }, []);
  useEffect(() => { if (user) { loadMembers(); loadActivity(); const iv = setInterval(loadActivity, 60000); return () => clearInterval(iv); } }, [user]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); toggleLeft(); }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') { e.preventDefault(); toggleRight(); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); toggleTheme(); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!booted) return <div className="min-h-screen grid place-items-center bg-bg text-fg-3">…</div>;
  if (!user) return <Login />;
  return (
    <div className="h-full flex overflow-hidden bg-bg text-fg">
      <aside className={`shrink-0 bg-bg-2 border-r border-line flex flex-col transition-[width] duration-200 overflow-hidden ${leftOpen ? 'w-[264px]' : 'w-0 border-r-0'}`}>
        <div className="w-[264px] h-full flex flex-col"><Sidebar /></div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col bg-bg"><Chat /></main>
      <aside className={`shrink-0 bg-bg-2 border-l border-line flex flex-col transition-[width] duration-200 overflow-hidden ${rightOpen ? 'w-[440px]' : 'w-0 border-l-0'}`}>
        <div className="w-[440px] h-full flex flex-col"><ErrorBoundary key={panelView}><RightPanel /></ErrorBoundary></div>
      </aside>
    </div>
  );
}
