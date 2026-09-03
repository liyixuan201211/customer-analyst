import { create } from 'zustand';
import { api, streamMessage, streamRegenerate, setTokenGetter, setOnUnauth } from '../lib/api.js';

const savedTheme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const applyTheme = (t) => { document.documentElement.classList.toggle('dark', t === 'dark'); localStorage.setItem('theme', t); };
applyTheme(savedTheme);

setTokenGetter(() => localStorage.getItem('token'));

export const useStore = create((set, get) => ({
  // ---- 账号 ----
  user: null,
  token: localStorage.getItem('token') || null,
  members: [],
  activity: [],
  locale: localStorage.getItem('locale') || (navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'),
  async bootstrap() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try { const { user } = await api.get('/auth/me'); set({ user, token, locale: user.locale || get().locale }); }
    catch { set({ user: null, token: null }); localStorage.removeItem('token'); }
  },
  async login(username, password) {
    const { token, user } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', token);
    set({ token, user, locale: user.locale || get().locale });
    return user;
  },
  async register(username, password, display_name) {
    const { token, user } = await api.post('/auth/register', { username, password, display_name, locale: get().locale });
    localStorage.setItem('token', token);
    set({ token, user, locale: user.locale || get().locale });
    return user;
  },
  async logout() {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  async updateMe(patch) {
    const { user } = await api.patch('/auth/me', patch);
    set({ user });
    return user;
  },
  async loadMembers() { try { set({ members: await api.get('/users') }); } catch {} },
  async loadActivity() { try { set({ activity: await api.get('/activity?limit=60') }); } catch {} },
  async saveLocale(locale) {
    localStorage.setItem('locale', locale);
    set({ locale });
    if (get().user) { try { await api.patch('/auth/me', { locale }); } catch {} }
  },
  setLocale(locale) { localStorage.setItem('locale', locale); set({ locale }); },

  // ---- 布局 ----
  theme: savedTheme,
  leftOpen: localStorage.getItem('leftOpen') !== '0',
  rightOpen: localStorage.getItem('rightOpen') !== '0',
  toggleTheme() { const t = get().theme === 'dark' ? 'light' : 'dark'; applyTheme(t); set({ theme: t }); },
  toggleLeft() { const v = !get().leftOpen; localStorage.setItem('leftOpen', v ? '1' : '0'); set({ leftOpen: v }); },
  toggleRight() { const v = !get().rightOpen; localStorage.setItem('rightOpen', v ? '1' : '0'); set({ rightOpen: v }); },

  // ---- 会话 ----
  conversations: [],
  currentId: null,
  messages: [],
  streaming: false,
  status: '',
  abort: null,

  // ---- 右侧栏 ----
  panel: { view: 'home' },
  panelHistory: [],
  models: null,

  async loadConversations() {
    const list = await api.get('/conversations');
    set({ conversations: list });
    if (!get().currentId && list.length) await get().openConversation(list[0].id);
  },
  async newConversation() {
    const c = await api.post('/conversations', {});
    set((s) => ({ conversations: [c, ...s.conversations], currentId: c.id, messages: [], panel: { view: 'home' }, panelHistory: [] }));
    return c;
  },
  async openConversation(id) {
    if (get().streaming) get().abort?.abort();
    const c = await api.get(`/conversations/${id}`);
    set({ currentId: id, messages: c.messages, streaming: false });
    if (c.customer_id) set({ panel: { view: 'customer', customer_id: c.customer_id }, panelHistory: [] });
  },
  async deleteConversation(id) {
    await api.del(`/conversations/${id}`);
    const rest = get().conversations.filter((c) => c.id !== id);
    set({ conversations: rest });
    if (get().currentId === id) { if (rest.length) await get().openConversation(rest[0].id); else set({ currentId: null, messages: [] }); }
  },
  async renameConversation(id, title) {
    const c = await api.patch(`/conversations/${id}`, { title });
    set((s) => ({ conversations: s.conversations.map((x) => (x.id === id ? { ...x, ...c } : x)) }));
  },
  async setConversationModel(model) {
    const id = get().currentId;
    if (!id) { await get().saveModels({ chat: model }); return; }
    const c = await api.patch(`/conversations/${id}`, { model });
    set((s) => ({ conversations: s.conversations.map((x) => (x.id === id ? { ...x, ...c } : x)) }));
  },

  _handleEvent(ev) {
    const upd = (fn) => set((s) => ({ messages: fn([...s.messages]) }));
    switch (ev.type) {
      case 'status': set({ status: ev.text }); break;
      case 'user_message': upd((m) => m.map((x) => (x.id === 'tmp-user' ? { ...x, id: ev.id, content: ev.content } : x))); break;
      case 'message_start': set({ status: '' }); upd((m) => [...m, { id: ev.id, role: 'assistant', content: '', reasoning: '', tool_calls: [], created_at: Date.now(), live: true }]); break;
      case 'reasoning': upd((m) => { const last = m[m.length - 1]; if (last?.live) last.reasoning = (last.reasoning || '') + ev.text; return m; }); break;
      case 'content': upd((m) => { const last = m[m.length - 1]; if (last?.live) last.content += ev.text; return m; }); break;
      case 'message_end': upd((m) => { const last = m.find((x) => x.id === ev.id); if (last) last.live = false; return m; }); break;
      case 'tool_call': upd((m) => { const a = [...m].reverse().find((x) => x.role === 'assistant'); if (a) a.tool_calls = [...(a.tool_calls || []), { id: ev.id, function: { name: ev.name, arguments: JSON.stringify(ev.args) }, running: true }]; return m; }); break;
      case 'tool_result':
        upd((m) => { for (const x of m) for (const tc of x.tool_calls || []) if (tc.id === ev.id) { tc.running = false; tc.result = ev.result; } m.push({ id: ev.message_id, role: 'tool', tool_call_id: ev.id, tool_name: ev.name, content: JSON.stringify(ev.result), created_at: Date.now() }); return m; });
        if (ev.panel) get().showPanel(ev.panel);
        break;
      case 'error': upd((m) => [...m, { id: 'err-' + Date.now(), role: 'assistant', content: '⚠️ ' + ev.message, created_at: Date.now(), error: true }]); break;
    }
  },
  async _afterStream(id) {
    set({ streaming: false, status: '', abort: null });
    const list = await api.get('/conversations');
    set({ conversations: list });
    const conv = list.find((c) => c.id === id);
    if (conv?.customer_id && get().panel.view === 'home') get().showPanel({ view: 'customer', customer_id: conv.customer_id });
  },

  async send(content, attachments = []) {
    let id = get().currentId;
    if (!id) id = (await get().newConversation()).id;
    const abort = new AbortController();
    const tempUser = { id: 'tmp-user', role: 'user', content, attachments: attachments.map((a) => ({ type: a.type, name: a.name, dataUrl: a.type === 'image' ? a.dataUrl : undefined })), created_at: Date.now() };
    set((s) => ({ messages: [...s.messages, tempUser], streaming: true, status: '', abort }));
    try { await streamMessage(id, { content, attachments }, get()._handleEvent, abort.signal); }
    catch (e) { if (e.name !== 'AbortError') get()._handleEvent({ type: 'error', message: e.message }); }
    finally { await get()._afterStream(id); }
  },
  async regenerate(messageId) {
    const id = get().currentId; if (!id || get().streaming) return;
    const abort = new AbortController();
    set((s) => { const i = s.messages.findIndex((m) => m.id === messageId); return { messages: i >= 0 ? s.messages.slice(0, i) : s.messages, streaming: true, abort }; });
    try { await streamRegenerate(id, messageId, get()._handleEvent, abort.signal); }
    catch (e) { if (e.name !== 'AbortError') get()._handleEvent({ type: 'error', message: e.message }); }
    finally { await get()._afterStream(id); }
  },
  async editAndResend(messageId, content) {
    const id = get().currentId; if (!id || get().streaming) return;
    await api.del(`/conversations/${id}/messages/${messageId}`);
    set((s) => { const i = s.messages.findIndex((m) => m.id === messageId); return { messages: i >= 0 ? s.messages.slice(0, i) : s.messages }; });
    await get().send(content);
  },
  stop() { get().abort?.abort(); },

  showPanel(panel) { set((s) => ({ panel, panelHistory: [...s.panelHistory.slice(-20), s.panel], rightOpen: true })); },
  panelBack() { set((s) => { const h = [...s.panelHistory]; const prev = h.pop() || { view: 'home' }; return { panel: prev, panelHistory: h }; }); },

  async loadModels() { const m = await api.get('/models'); set({ models: m }); return m; },
  async saveModels(sel) { const r = await api.put('/settings/models', sel); set((s) => ({ models: { ...s.models, selected: r.selected } })); },
}));

setOnUnauth(() => { localStorage.removeItem('token'); useStore.setState({ user: null, token: null }); });
