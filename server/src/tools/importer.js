// 聊天记录导入：文本解析 + 截图识别（视觉模型）
import { chatRecords, customers, getSetting } from '../db/index.js';
import { vision, chatJSON, DEFAULTS } from '../llm/aiping.js';

/** 解析常见聊天记录文本格式（微信/QQ/钉钉导出、通用 "说话人: 内容"） */
export function parseChatText(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let cur = null;
  const patterns = [
    // [任意时间] 说话人: 内容   (视觉模型转写格式，含中文日期)
    /^\[([^\]]{0,40})\]\s*([^:：]{1,30})[:：]\s*(.*)$/,
    // 2024-01-02 10:11:12 张三\n内容  (微信 PC 导出)
    /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)$/,
    // 张三 2024-01-02 10:11:12
    /^(.+?)\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)$/,
    // 10:11 张三: 内容
    /^(\d{1,2}:\d{2}(?::\d{2})?)\s*(.+?)[:：]\s*(.*)$/,
    // 张三: 内容
    /^([^:：\s]{1,20})[:：]\s*(.*)$/,
  ];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(patterns[0]))) { cur = { time: m[1].trim(), speaker: m[2].trim(), text: m[3] }; out.push(cur); continue; }
    if ((m = line.match(patterns[1]))) { cur = { time: m[1], speaker: m[2].trim(), text: '' }; out.push(cur); continue; }
    if ((m = line.match(patterns[2]))) { cur = { time: m[2], speaker: m[1].trim(), text: '' }; out.push(cur); continue; }
    if ((m = line.match(patterns[3]))) { cur = { time: m[1], speaker: m[2].trim(), text: m[3] }; out.push(cur); continue; }
    if ((m = line.match(patterns[4]))) { cur = { time: '', speaker: m[1].trim(), text: m[2] }; out.push(cur); continue; }
    if (cur) cur.text = cur.text ? cur.text + '\n' + line : line;
    else { cur = { time: '', speaker: '', text: line }; out.push(cur); }
  }
  return out.filter(m => m.text || m.speaker);
}

export const toTranscript = (parsed) => parsed.map(m => `${m.time ? `[${m.time}] ` : ''}${m.speaker ? m.speaker + ': ' : ''}${m.text}`).join('\n');

/** 用视觉模型把聊天截图转成结构化对话 */
export async function ocrChatScreenshot(dataUrls) {
  const model = getSetting('models', {}).vision || DEFAULTS.vision;
  const prompt = `这是一张或多张聊天软件截图（微信/QQ/钉钉/短信等）。请逐条完整转写对话内容，按时间顺序，严格使用以下格式，每条一行：
[时间(若无则留空)] 说话人: 消息内容
规则：
- 右侧气泡（绿色/蓝色）通常是"我方"，左侧是"客户"，如截图中有昵称请使用昵称，否则用"我方"/"客户"。
- 保留表情描述如 [微笑]，图片消息写 [图片]，语音写 [语音]，转账/红包写明金额。
- 不要总结，不要遗漏，不要添加不存在的内容。`;
  const text = await vision({ model, prompt, images: dataUrls });
  return { raw: text, parsed: parseChatText(text) };
}

/** 保存一条聊天记录并可自动关联/创建客户 */
export function saveRecord({ customer_id, customer_name, source, file_name, content, parsed }) {
  let cid = customer_id || null;
  if (!cid && customer_name) {
    const c = customers.findByName(customer_name) || customers.create({ name: customer_name });
    cid = c.id;
  }
  const id = chatRecords.add({ customer_id: cid, source, file_name, content, parsed });
  return { id, customer_id: cid };
}

/** 从记录中自动识别客户名（用于未指定客户时） */
export async function guessCustomerName(transcript) {
  const r = await chatJSON({
    system: '你是客户关系管理助手。根据聊天记录判断"客户"是谁（非我方员工/销售），输出 {"customer":"名字","our_side":"我方名字或空","confidence":0-1}。若无法判断 customer 填 "未知客户"。',
    user: transcript.slice(0, 4000),
  });
  return r?.customer || '未知客户';
}
