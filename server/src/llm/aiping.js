// AI Ping 平台 OpenAI 兼容客户端 + 模型注册表
const BASE = (process.env.AIPING_BASE_URL || 'https://aiping.cn/api/v1').replace(/\/$/, '');
const KEY = process.env.AIPING_API_KEY || '';

// 按能力分类的推荐模型（均已在 AI Ping 平台验证可用）
export const MODEL_REGISTRY = {
  chat: [
    { id: 'DeepSeek-V4-Flash-Vision-Exp', label: 'DeepSeek V4 Flash Vision', desc: '多模态+工具调用，快速（默认）', reasoning: true, vision: true },
    { id: 'DeepSeek-V4-Flash', label: 'DeepSeek V4 Flash', desc: '快速推理', reasoning: true },
    { id: 'DeepSeek-V4-Pro', label: 'DeepSeek V4 Pro', desc: '旗舰推理', reasoning: true },
    { id: 'DeepSeek-V3.2', label: 'DeepSeek V3.2', desc: '推理+工具调用，稳定', reasoning: true },
    { id: 'Kimi-K2.5', label: 'Kimi K2.5', desc: '响应快，长上下文', reasoning: false },
    { id: 'GLM-4.7', label: 'GLM 4.7', desc: '中文理解好，工具调用稳定', reasoning: true },
    { id: 'Qwen3-235B-A22B-Instruct-2507', label: 'Qwen3 235B Instruct', desc: '高质量指令模型', reasoning: false },
    { id: 'Qwen3.5-Plus', label: 'Qwen3.5 Plus', desc: '通义最新旗舰', reasoning: true },
    { id: 'DeepSeek-R1-0528', label: 'DeepSeek R1', desc: '深度推理', reasoning: true },
    { id: 'MiniMax-M2.5', label: 'MiniMax M2.5', desc: '多轮对话', reasoning: false },
  ],
  vision: [
    { id: 'DeepSeek-V4-Flash-Vision-Exp', label: 'DeepSeek V4 Flash Vision', desc: '截图识别（默认）' },
    { id: 'Qwen3-VL-30B-A3B-Instruct', label: 'Qwen3-VL 30B', desc: '截图识别，快速' },
    { id: 'Qwen3-VL-235B-A22B-Instruct', label: 'Qwen3-VL 235B', desc: '截图识别，精度高' },
    { id: 'Qwen2.5-VL-72B-Instruct', label: 'Qwen2.5-VL 72B', desc: '稳定备选' },
    { id: 'GLM-4.6V', label: 'GLM 4.6V', desc: '视觉推理' },
  ],
  image: [
    { id: 'Qwen-Image', label: 'Qwen-Image', desc: '文生图（默认）' },
    { id: 'Doubao-Seedream-4.5', label: '豆包 Seedream 4.5', desc: '中文海报/营销图' },
    { id: 'Kolors', label: 'Kolors', desc: '写实风' },
  ],
  embedding: [
    { id: 'Qwen3-Embedding-0.6B', label: 'Qwen3-Embedding 0.6B', desc: '1024 维，快速（默认）' },
    { id: 'Qwen3-Embedding-4B', label: 'Qwen3-Embedding 4B', desc: '更高精度' },
  ],
};
export const DEFAULTS = { chat: 'DeepSeek-V4-Flash-Vision-Exp', vision: 'DeepSeek-V4-Flash-Vision-Exp', image: 'Qwen-Image', embedding: 'Qwen3-Embedding-0.6B' };

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` });

async function post(path, body, { signal } = {}) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI Ping ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return res;
}

export async function listRemoteModels() {
  const res = await fetch(`${BASE}/models`, { headers: headers() });
  if (!res.ok) throw new Error(`models ${res.status}`);
  const d = await res.json();
  return (d.data || []).map(m => m.id);
}

/** 非流式对话 */
export async function chat({ model, messages, tools, temperature = 0.4, max_tokens, thinking, response_format, signal }) {
  const body = { model, messages, temperature, stream: false };
  if (tools?.length) body.tools = tools;
  if (max_tokens) body.max_tokens = max_tokens;
  if (thinking === false) body.thinking = { type: 'disabled' };
  if (response_format) body.response_format = response_format;
  const res = await post('/chat/completions', body, { signal });
  const d = await res.json();
  if (d.code && d.code !== 0 && !d.choices) throw new Error(d.msg || 'AI Ping error');
  return d.choices?.[0]?.message ?? { role: 'assistant', content: '' };
}

/**
 * 流式对话：yield 事件 {type:'reasoning'|'content', text} 与 {type:'tool_call', ...}
 * 结束时返回汇总的 message（含 tool_calls）
 */
export async function* chatStream({ model, messages, tools, temperature = 0.4, max_tokens, thinking, signal }) {
  const body = { model, messages, temperature, stream: true };
  if (tools?.length) body.tools = tools;
  if (max_tokens) body.max_tokens = max_tokens;
  if (thinking === false) body.thinking = { type: 'disabled' };
  const res = await post('/chat/completions', body, { signal });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const acc = { content: '', reasoning: '', tool_calls: [] };
  let finish = null;

  const handle = (json) => {
    if (json.code && json.code !== 0 && !json.choices) throw new Error(json.msg || 'AI Ping stream error');
    const ch = json.choices?.[0];
    if (!ch) return null;
    const delta = ch.delta || {};
    const evs = [];
    if (delta.reasoning_content) { acc.reasoning += delta.reasoning_content; evs.push({ type: 'reasoning', text: delta.reasoning_content }); }
    if (delta.content) { acc.content += delta.content; evs.push({ type: 'content', text: delta.content }); }
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const i = tc.index ?? 0;
        if (!acc.tool_calls[i]) acc.tool_calls[i] = { id: tc.id || `call_${Date.now()}_${i}`, type: 'function', function: { name: '', arguments: '' } };
        const cur = acc.tool_calls[i];
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.function.name = tc.function.name;
        if (tc.function?.arguments) cur.function.arguments += tc.function.arguments;
      }
    }
    if (ch.finish_reason) finish = ch.finish_reason;
    return evs;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      let json; try { json = JSON.parse(data); } catch { continue; }
      const evs = handle(json);
      if (evs) for (const e of evs) yield e;
    }
  }
  acc.tool_calls = acc.tool_calls.filter(Boolean);
  return { role: 'assistant', content: acc.content, reasoning: acc.reasoning, tool_calls: acc.tool_calls.length ? acc.tool_calls : undefined, finish_reason: finish };
}

/** 视觉模型：分析图片（dataURL 或 http URL） */
export async function vision({ model = DEFAULTS.vision, prompt, images, max_tokens = 4000 }) {
  const content = [{ type: 'text', text: prompt }, ...images.map(url => ({ type: 'image_url', image_url: { url } }))];
  const msg = await chat({ model, messages: [{ role: 'user', content }], max_tokens, temperature: 0.1, thinking: false });
  return msg.content || '';
}

/** 文生图 */
export async function generateImage({ model = DEFAULTS.image, prompt, size = '1024x1024', n = 1 }) {
  const res = await post('/images/generations', { model, prompt, size, n });
  const d = await res.json();
  return (d.data || []).map(x => x.url || (x.b64_json ? `data:image/png;base64,${x.b64_json}` : null)).filter(Boolean);
}

/** 向量化 */
export async function embed(input, model = DEFAULTS.embedding) {
  const arr = Array.isArray(input) ? input : [input];
  const out = [];
  for (let i = 0; i < arr.length; i += 16) {
    const res = await post('/embeddings', { model, input: arr.slice(i, i + 16) });
    const d = await res.json();
    out.push(...(d.data || []).sort((a, b) => a.index - b.index).map(x => x.embedding));
  }
  return out;
}

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/** 让模型输出 JSON（容错解析） */
export async function chatJSON({ model = DEFAULTS.chat, system, user, temperature = 0.2 }) {
  const msg = await chat({
    model, temperature, thinking: false,
    messages: [{ role: 'system', content: system + '\n\n只输出一个合法 JSON 对象，不要加 Markdown 代码块或其他文字。' }, { role: 'user', content: user }],
  });
  return parseJSON(msg.content);
}
export function parseJSON(text) {
  if (!text) return null;
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const s = (m ? m[1] : text).trim();
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}
