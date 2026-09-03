import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { api } from './routes/api.js';
import './db/index.js';
import { ensureAdmin } from './auth.js';

ensureAdmin();

const app = new Hono();
app.use('*', cors());
app.get('/api/health', (c) => c.json({ ok: true, provider: process.env.AIPING_BASE_URL, hasKey: !!process.env.AIPING_API_KEY }));
app.route('/api', api);

// 生产模式：托管前端构建产物
const dist = resolve(process.cwd(), '../web/dist');
if (existsSync(dist)) {
  app.use('/*', serveStatic({ root: '../web/dist' }));
  app.get('*', serveStatic({ root: '../web/dist', path: 'index.html' }));
}

const port = +(process.env.PORT || 3090);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[analyst] server listening on http://127.0.0.1:${info.port}  (static: ${existsSync(dist) ? 'web/dist' : 'none, use vite dev'})`);
});
