// 请求工具：自动附带登录 token，401 时通知 store 登出
const BASE = '/api';
let getToken = () => localStorage.getItem('token');
let onUnauth = null;

export function setTokenGetter(fn) { getToken = fn; }
export function setOnUnauth(fn) { onUnauth = fn; }

const authHeaders = (isForm) => {
  const t = getToken();
  const h = { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(t ? { Authorization: `Bearer ${t}` } : {}) };
  return h;
};

async function req(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: authHeaders(false), body: body !== undefined ? JSON.stringify(body) : undefined });
  const d = await res.json().catch(() => ({}));
  if (res.status === 401) { onUnauth?.(d); throw new Error(d.error || '未登录'); }
  if (!res.ok) throw new Error(d.error || `${res.status}`);
  return d;
}
export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b ?? {}),
  patch: (p, b) => req('PATCH', p, b),
  put: (p, b) => req('PUT', p, b),
  del: (p) => req('DELETE', p),
};

async function openStream(url, body, onEvent, signal) {
  const res = await fetch(url, { method: 'POST', headers: authHeaders(false), body: JSON.stringify(body), signal });
  if (!res.ok) { const d = await res.json().catch(() => ({})); if (res.status === 401) onUnauth?.(d); throw new Error(d.error || res.status); }
  await readSSE(res, onEvent);
}
export async function streamMessage(conversationId, payload, onEvent, signal) {
  return openStream(`${BASE}/conversations/${conversationId}/messages`, payload, onEvent, signal);
}
export async function streamRegenerate(conversationId, messageId, onEvent, signal) {
  return openStream(`${BASE}/conversations/${conversationId}/regenerate`, { message_id: messageId }, onEvent, signal);
}

async function readSSE(res, onEvent) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try { onEvent(JSON.parse(line.slice(5).trim())); } catch {}
      }
    }
  }
}

export const readFileAsDataURL = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
export const readFileAsText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
