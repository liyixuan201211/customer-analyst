// 全屏数据大屏：提供数据 + 说明（前端渲染大屏视图）
export default function register(api) {
  api.get('/bigscreen', (c) => c.json({ name: '客户分析大屏', refresh_seconds: 30, data: '/api/dashboard/v2', fullscreen_hint: '浏览器按 F11 或调用 requestFullscreen', color: '#4d6bfe' }));
}
