// Agent 运行时：多轮工具调用循环 + SSE 事件流
import { messages as msgStore, conversations, customers, getSetting } from '../db/index.js';
import { chatStream, DEFAULTS, MODEL_REGISTRY } from '../llm/aiping.js';
import { TOOL_DEFS, runTool } from './tools.js';

const MAX_TOOL_ROUNDS = 8;

function systemPrompt(conv, locale) {
  const customer = conv.customer_id ? customers.get(conv.customer_id) : null;
  const langHint = locale && locale !== 'zh-CN' ? `\n语言要求：请用与用户一致的语言回复（当前界面语言：${locale}）。用户用英文则全程用英文，用中文则用中文；表格/字段名等也用对应语言。` : '';
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  return `你是「客户分析智能体」，服务于公司的销售与客户运营团队。今天是 ${today}。${langHint}

你的能力（通过工具实现）：
1. 导入聊天记录（文本粘贴或截图，截图由系统预先识别为文本后附在用户消息中）
2. 知识库检索（公司产品资料、话术、案例）
3. 联网搜索（行业、竞品、客户背景）
4. 深层客户画像与忠诚度分析
5. 产出多维分析表格与建议对话方式
6. 动态定价（价格分布、客户分层价）、库存/货物管理、人员管理与分配
7. RFM 客户分层（近度/频次/金额 → 分层策略）、跟进任务管理（创建/完成/今日逾期）、生成可直接发送的跟进邮件/WhatsApp（中英文）

工作原则：
- 先用工具获取事实，再下结论；引用聊天记录原文作为依据。
- 用户提到某客户时，先 list_customers/get_customer 找到对应 ID 再调用分析工具；找不到就询问或按用户意图新建。
- 用户粘贴聊天记录时，直接 import_chat_text 导入，导入完成后主动建议做画像与忠诚度分析。
- 分析类工具（画像/忠诚度/表格/定价）的详细结果会自动展示在右侧面板，你的回复只需精炼总结要点 + 给出可执行建议，不必重复完整 JSON。
- 涉及定价务必给出理由与风险；涉及库存/人员变更要确认关键参数后再执行（若用户已明确给出参数则直接执行）。
- 回答使用中文，结构清晰（适度使用小标题、列表、表格），避免空话。
${customer ? `\n当前会话关联客户：${customer.name}（ID: ${customer.id}）${customer.profile?.summary ? '，画像摘要：' + customer.profile.summary : ''}${customer.loyalty ? `，忠诚度 ${customer.loyalty.score}（${customer.loyalty.level}）` : ''}。用户未指明客户时默认指该客户。` : ''}`;
}

/** 把 DB 消息转换成 OpenAI 格式 */
function toLLMMessages(rows, { vision = false } = {}) {
  const out = [];
  const lastUserIdx = rows.map(m => m.role).lastIndexOf('user');
  rows.forEach((m, i) => {
    if (m.role === 'user') {
      // 多模态模型：仅最近一条用户消息附带原图（避免历史上下文过大）
      const imgs = vision && i === lastUserIdx ? (m.attachments || []).filter(a => a.type === 'image' && a.dataUrl) : [];
      if (imgs.length) out.push({ role: 'user', content: [{ type: 'text', text: m.content || '（见图片）' }, ...imgs.map(a => ({ type: 'image_url', image_url: { url: a.dataUrl } }))] });
      else out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      const msg = { role: 'assistant', content: m.content || '' };
      if (m.tool_calls?.length) msg.tool_calls = m.tool_calls;
      out.push(msg);
    } else if (m.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: m.tool_call_id, content: m.content });
    }
  });
  return out;
}

const truncate = (s, n = 12000) => (s.length > n ? s.slice(0, n) + `\n...(结果过长已截断，共 ${s.length} 字)` : s);

/**
 * 运行一轮 Agent。emit(event) 推送 SSE 事件：
 * {type:'message_start', id, role}  {type:'reasoning', text}  {type:'content', text}
 * {type:'tool_call', id, name, args} {type:'tool_result', id, name, result, panel}
 * {type:'message_end', id}  {type:'done'}  {type:'error', message}
 */
export async function runAgent({ conversation_id, emit, signal, locale }) {
  const conv = conversations.get(conversation_id);
  if (!conv) throw new Error('会话不存在');
  const settings = getSetting('models', {});
  const model = conv.model || settings.chat || DEFAULTS.chat;
  const modelInfo = MODEL_REGISTRY.chat.find(m => m.id === model);
  const thinking = settings.thinking ?? (modelInfo?.reasoning ?? true);

  const history = msgStore.list(conversation_id);
  const llmMessages = [{ role: 'system', content: systemPrompt(conv, locale) }, ...toLLMMessages(history, { vision: !!modelInfo?.vision })];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const msgId = crypto.randomUUID();
    emit({ type: 'message_start', id: msgId, role: 'assistant' });
    const gen = chatStream({ model, messages: llmMessages, tools: TOOL_DEFS, thinking: thinking ? undefined : false, signal });
    let final;
    while (true) {
      const { value, done } = await gen.next();
      if (done) { final = value; break; }
      emit(value);
    }
    const assistantRow = { id: msgId, role: 'assistant', content: final.content, reasoning: final.reasoning || null, tool_calls: final.tool_calls };
    msgStore.add(conversation_id, assistantRow);
    llmMessages.push({ role: 'assistant', content: final.content || '', ...(final.tool_calls ? { tool_calls: final.tool_calls } : {}) });
    emit({ type: 'message_end', id: msgId });

    if (!final.tool_calls?.length) break;

    // 执行工具
    for (const tc of final.tool_calls) {
      let args = {};
      try { args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}; } catch { args = {}; }
      emit({ type: 'tool_call', id: tc.id, name: tc.function.name, args });
      let out;
      try { out = await runTool(tc.function.name, args, { conversation_id, actor, actor_id: actor?.id, actor_name: actor?.display_name || actor?.username, locale }); }
      catch (e) { out = { result: { error: String(e.message || e) } }; }
      // 会话自动关联客户
      if (out.panel?.customer_id && !conv.customer_id) { conversations.update(conversation_id, { customer_id: out.panel.customer_id }); conv.customer_id = out.panel.customer_id; }
      const content = truncate(JSON.stringify(out.result ?? null));
      const toolMsgId = crypto.randomUUID();
      msgStore.add(conversation_id, { id: toolMsgId, role: 'tool', content, tool_call_id: tc.id, tool_name: tc.function.name });
      llmMessages.push({ role: 'tool', tool_call_id: tc.id, content });
      emit({ type: 'tool_result', id: tc.id, message_id: toolMsgId, name: tc.function.name, result: out.result, panel: out.panel });
    }
    if (round === MAX_TOOL_ROUNDS) {
      emit({ type: 'content', text: '\n\n（已达到单轮工具调用上限，请继续提问以获取更多结果）' });
    }
  }
  // 自动命名会话
  if (conv.title === '新对话') {
    const firstUser = history.find(m => m.role === 'user');
    if (firstUser) conversations.update(conversation_id, { title: firstUser.content.replace(/\s+/g, ' ').slice(0, 30) });
  }
  emit({ type: 'done' });
}
