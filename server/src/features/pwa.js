// 移动端 / PWA：安装与能力说明
export default function register(api) {
  const CAPS = [
    { k: 'install', zh: '可安装到桌面/主屏', en: 'Installable to home screen' },
    { k: 'offline', zh: '离线可打开（PWA 缓存）', en: 'Works offline (cached)' },
    { k: 'responsive', zh: '响应式布局，适配手机/平板', en: 'Responsive for phones/tablets' },
    { k: 'push', zh: '跟进到期通知（预留）', en: 'Follow-up reminders (reserved)' },
  ];
  api.get('/pwa', (c) => c.json({ name: '客户分析智能体', capabilities: CAPS, manifest: '/manifest.webmanifest', serviceWorker: '/sw.js' }));
}
