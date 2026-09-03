import React, { useEffect, useState } from 'react';
import { Smartphone, WifiOff, MonitorSmartphone, Bell, Download } from 'lucide-react';
import { useI18n } from '../../i18n.js';
import { api } from '../../lib/api.js';
import { Section, Card, Empty } from '../ui.jsx';

const ICON = { install: Smartphone, offline: WifiOff, responsive: MonitorSmartphone, push: Bell };
export default function PwaPanel() {
  const { t, locale } = useI18n(); const Z = locale === 'en-US';
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/pwa').then(setD).catch(() => {}); }, []);
  if (!d) return <Empty text={t('loading')} />;
  const canInstall = typeof window !== 'undefined' && 'serviceWorker' in navigator;
  return (
    <>
      <Section title={Z ? 'Mobile / PWA' : '移动端 / PWA'}>
        <Card className="mb-2">
          <div className="text-sm font-semibold">{d.name}</div>
          <div className="text-[11px] text-fg-3 mt-0.5">{Z ? 'Responsive layout + installable PWA for field sales.' : '响应式布局 + 可安装 PWA，适合销售外勤。'}</div>
        </Card>
        {d.capabilities.map(c => { const Icon = ICON[c.k] || Smartphone; return (
          <Card key={c.k} className="mb-1.5 flex items-center gap-2"><Icon size={15} className="text-brand" /><span className="text-[13px]">{Z ? c.en : c.zh}</span></Card>
        ); })}
        <Card className="mt-2 text-[12px] text-fg-2 leading-relaxed">
          {Z ? 'In browser: open the ⋮/⋯ menu → "Install app" to add to home screen. The interface already adapts to phone/tablet widths.' : '在浏览器打开菜单 →「安装应用」即可添加到主屏。界面已按手机/平板宽度自适应。'}
          {canInstall && <div className="mt-1 text-fg-3 text-[11px]">serviceWorker supported: yes</div>}
        </Card>
        <a href="/manifest.webmanifest" className="mt-2 inline-flex items-center gap-1 rounded-md bg-elev border border-line-2 hover:bg-bg-3 px-2 py-1 text-xs"><Download size={11} /> manifest.json</a>
      </Section>
    </>
  );
}
