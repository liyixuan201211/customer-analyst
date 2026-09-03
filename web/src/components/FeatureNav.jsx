import React from 'react';
import { Sunrise, Receipt, AlertTriangle, Scale, MessagesSquare, ClipboardList, BadgeCheck, History, LayoutDashboard, Boxes, UserCog, Activity, BookOpen, Settings } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/index.js';
import { useI18n } from '../i18n.js';
import { FEATURE_TITLES } from '../panels/features/index.jsx';

const ICONS = { Sunrise, Receipt, AlertTriangle, Scale, MessagesSquare, ClipboardList, BadgeCheck, History, LayoutDashboard };
// 从 FEATURE_TITLES 生成导航（取前 N 项）
const VIEWS = Object.keys(FEATURE_TITLES);

export function FeatureNav() {
  const { panel, showPanel } = useStore();
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  const items = all ? VIEWS : VIEWS.slice(0, 9);
  return (
    <nav className="px-2 pb-2 grid grid-cols-3 gap-1">
      {items.map((view) => {
        const Icon = ICONS[view] || Boxes;
        return <button key={view} onClick={() => showPanel({ view })} title={FEATURE_TITLES[view]}
          className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10.5px] transition ${panel.view === view ? 'bg-brand-soft text-brand' : 'text-fg-2 hover:bg-bg-3'}`}>
          <Icon size={16} /> {FEATURE_TITLES[view]}
        </button>;
      })}
      <button onClick={() => setAll(!all)} className="w-full text-center text-[11px] text-fg-3 hover:text-fg py-1">{all ? '收起' : '展开全部功能 ▾'}</button>
    </nav>
  );
}
