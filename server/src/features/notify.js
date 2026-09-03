// IM 通知机器人：企业微信/钉钉/Telegram Webhook 推送（到期/审批/异常/简报）
import { getSetting, setSetting, followups, approvals } from '../db/index.js';
import { activity } from '../auth.js';

const CHANNELS = ['dingtalk', 'wecom', 'telegram'];

async function send(channel, webhookUrl, text) {
  if (!webhookUrl) return { ok: false, error: '未配置 webhook' };
  try {
    if (channel === 'dingtalk') await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgtype: 'text', text: { content: text } }) });
    else if (channel === 'wecom') await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgtype: 'text', text: { content: text } }) });
    else if (channel === 'telegram') { const [botToken, chatId] = webhookUrl.split('|'); await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }) }); }
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/notify/config', (c) => { const cfg = getSetting('im', {}); return c.json({ channels: CHANNELS, config: cfg }); });
  api.post('/notify/config', async (c) => { const b = await c.req.json(); setSetting('im', { ...getSetting('im', {}), ...b }); return c.json(getSetting('im', {})); });
  api.post('/notify/send', async (c) => {
    const { channel, text, to } = await c.req.json();
    const cfg = getSetting('im', {}); const url = to || cfg[channel];
    if (!url) return c.json({ ok: false, error: '该渠道未配置' }, 400);
    const r = await send(channel, url, text || '通知');
    activity.log(u(c), 'add', 'notify', null, `IM 通知（${channel}）：${(text || '').slice(0, 40)}`);
    return c.json(r);
  });
  api.post('/notify/reminders', async (c) => {
    // 一键推送当前到期/逾期跟进 + 待审批
    const cfg = getSetting('im', {}); const chan = c.req.query('channel') || getSetting('im', {}).default || 'dingtalk'; const url = cfg[chan];
    if (!url) return c.json({ error: '该渠道未配置' }, 400);
    const today = followups.list({ status: 'today' }).length; const overdue = followups.list({ status: 'open' }).length; const pend = approvals.countPending();
    const text = `📋 客户分析提醒\n今日跟进：${today}\n逾期跟进：${overdue}\n待审批：${pend}`;
    return c.json(await send(chan, url, text));
  });
}
