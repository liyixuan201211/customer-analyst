// 语音记录：上传/存储录音，可选 ASR 转写（若配置了 OpenAI 兼容 ASR），转写可并入聊天记录
import { customers, chatRecords, voiceNotes } from '../db/index.js';
import { activity } from '../auth.js';

const ASR_BASE = process.env.ASR_BASE_URL || '';
const ASR_KEY = process.env.ASR_API_KEY || '';

export default function register(api, ctx) {
  const u = (c) => ctx.me(c);
  api.get('/voice', (c) => c.json(voiceNotes.list({ customer_id: c.req.query('customer_id') })));
  api.post('/voice', async (c) => {
    const b = await c.req.json(); // {customer_id, file_name, file_size, duration, transcript?}
    if (!b.customer_id) return c.json({ error: '请选择客户' }, 400);
    let transcript = b.transcript || '';
    // 若提供 audio dataURL 且有 ASR 配置，则尝试转写
    if (b.audio && ASR_BASE && ASR_KEY) {
      try { transcript = await transcribe(b.audio); } catch (e) { transcript = ''; }
    }
    const v = voiceNotes.create({ ...b, transcript, created_by: u(c)?.id });
    // 转写到聊天记录
    if (b.note && b.customer_id) chatRecords.add({ customer_id: b.customer_id, source: 'voice', file_name: b.file_name, content: b.note || transcript || '语音记录', parsed: (b.note || transcript || '').split(/\n/).filter(Boolean).map(t => ({ speaker: '语音', text: t })), owner_id: u(c)?.id });
    activity.log(u(c), 'add', 'voice', v.id, `语音 ${b.file_name || ''}`);
    return c.json(v);
  });
  api.patch('/voice/:id', async (c) => c.json(voiceNotes.update(c.req.param('id'), await c.req.json())));
  api.delete('/voice/:id', (c) => { voiceNotes.remove(c.req.param('id')); return c.json({ ok: true }); });
}

async function transcribe(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  const buf = Buffer.from(b64, 'base64');
  const form = new FormData(); form.append('file', new Blob([buf]), 'audio.m4a'); form.append('model', 'whisper-1');
  const res = await fetch(ASR_BASE + '/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${ASR_KEY}` }, body: form });
  const d = await res.json(); return d.text || '';
}
