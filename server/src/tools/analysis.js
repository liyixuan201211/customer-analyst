// 客户分析：深层画像 / 忠诚度 / 多维表格 / 沟通建议
import { customers, chatRecords, tables, getSetting } from '../db/index.js';
import { chatJSON, DEFAULTS } from '../llm/aiping.js';

const chatModel = () => getSetting('models', {}).chat || DEFAULTS.chat;

export function gatherCustomerContext(customer_id, maxChars = 12000) {
  const c = customers.get(customer_id);
  if (!c) throw new Error('客户不存在');
  const recs = chatRecords.list(customer_id);
  let transcript = '';
  for (const r of recs) {
    const block = `\n===== 记录(${r.source}${r.file_name ? ' ' + r.file_name : ''}, ${new Date(r.created_at).toLocaleDateString('zh-CN')}) =====\n${r.content}`;
    if (transcript.length + block.length > maxChars) { transcript += block.slice(0, maxChars - transcript.length); break; }
    transcript += block;
  }
  return { customer: c, records: recs.length, transcript };
}

/** 深层用户画像 */
export async function buildProfile(customer_id, extra = '') {
  const { customer, transcript, records } = gatherCustomerContext(customer_id);
  if (!transcript && !extra) throw new Error('该客户暂无聊天记录，请先导入记录');
  const profile = await chatJSON({
    model: chatModel(),
    system: `你是资深客户分析专家，擅长从沟通记录中挖掘深层用户画像。输出 JSON，结构：
{
 "summary": "一句话概括该客户",
 "basic": {"role":"决策角色(决策者/影响者/使用者/采购)", "industry":"", "company_size":"", "region":"", "budget_level":"高/中/低/未知"},
 "personality": {"type":"DISC 类型(D支配/I影响/S稳健/C谨慎)", "traits":["..."], "communication_style":"简述沟通风格"},
 "needs": {"explicit":["明确需求"], "implicit":["隐性需求"], "pain_points":["痛点"]},
 "decision": {"drivers":["决策驱动因素"], "concerns":["顾虑"], "stage":"认知/兴趣/评估/谈判/成交/复购", "urgency":"高/中/低"},
 "price_sensitivity": {"level":"高/中/低", "evidence":"依据"},
 "behavior": {"response_speed":"快/中/慢", "active_hours":"活跃时段", "preferred_channel":"偏好渠道", "engagement":"互动积极度 0-100 的数字"},
 "risks": ["流失风险/合作风险"],
 "opportunities": ["增购/转介绍等机会"],
 "tags": ["3-8 个标签"],
 "evidence": ["引用原文片段作为关键依据，3-6 条"]
}`,
    user: `客户：${customer.name}${customer.company ? '（' + customer.company + '）' : ''}\n已有备注：${customer.notes || '无'}\n补充信息：${extra || '无'}\n\n聊天记录（共 ${records} 份）：\n${transcript}`,
  });
  if (!profile) throw new Error('模型未返回有效画像');
  customers.update(customer_id, { profile, tags: profile.tags?.length ? profile.tags : customer.tags });
  return profile;
}

/** 忠诚度分析（结合规则评分 + 模型判断） */
export async function analyzeLoyalty(customer_id) {
  const { customer, transcript, records } = gatherCustomerContext(customer_id);
  if (!transcript) throw new Error('该客户暂无聊天记录，请先导入记录');
  const result = await chatJSON({
    model: chatModel(),
    system: `你是客户忠诚度分析专家。基于沟通记录评估客户忠诚度，输出 JSON：
{
 "score": 0-100 的整数总分,
 "level": "铁杆/忠诚/一般/摇摆/流失风险",
 "dimensions": [
   {"name":"满意度","score":0-100,"evidence":"依据"},
   {"name":"信任度","score":0-100,"evidence":""},
   {"name":"复购意愿","score":0-100,"evidence":""},
   {"name":"推荐意愿(NPS倾向)","score":0-100,"evidence":""},
   {"name":"互动黏性","score":0-100,"evidence":""},
   {"name":"价格容忍度","score":0-100,"evidence":""}
 ],
 "churn_risk": {"level":"高/中/低", "probability": 0-1, "signals":["流失信号"]},
 "lifecycle_stage": "新客/成长/成熟/衰退/流失",
 "trend": "上升/稳定/下降",
 "retention_actions": ["3-5 条具体可执行的维系动作"],
 "next_contact": {"timing":"建议下次联系时机", "topic":"建议话题", "channel":"渠道"}
}`,
    user: `客户：${customer.name}\n已有画像摘要：${customer.profile?.summary || '无'}\n\n聊天记录（${records} 份）：\n${transcript}`,
  });
  if (!result) throw new Error('模型未返回有效结果');
  result.analyzed_at = Date.now();
  customers.update(customer_id, { loyalty: result });
  return result;
}

/** 生成多维表格 + 沟通建议 */
export async function buildTableAndAdvice(customer_id, focus = '') {
  const { customer, transcript } = gatherCustomerContext(customer_id, 9000);
  const r = await chatJSON({
    model: chatModel(),
    system: `你是客户运营顾问。根据客户画像、忠诚度与聊天记录，产出"多维分析表"与"建议对话方式"。输出 JSON：
{
 "table": {
   "title": "表格标题",
   "columns": [{"key":"dimension","label":"维度"},{"key":"finding","label":"发现"},{"key":"score","label":"评分(0-10)"},{"key":"action","label":"建议动作"},{"key":"priority","label":"优先级"}],
   "rows": [ {"dimension":"需求匹配","finding":"...","score":8,"action":"...","priority":"高"}, ... 8-12 行，维度覆盖：需求匹配、预算、决策链、价格敏感、信任、时间紧迫度、竞品、服务体验、复购、转介绍、风险 ]
 },
 "talk_guide": {
   "tone": "整体语气建议",
   "do": ["应该做的 4-6 条"],
   "dont": ["避免的 3-5 条"],
   "openers": ["3 条开场白示例"],
   "objection_handling": [{"objection":"客户可能的异议","response":"应对话术"}],
   "closing": ["2-3 条促成话术"],
   "scripts": [{"scene":"场景(如报价/催单/回访)","script":"完整话术"}]
 }
}`,
    user: `客户：${customer.name}\n画像：${JSON.stringify(customer.profile || {}).slice(0, 3000)}\n忠诚度：${JSON.stringify(customer.loyalty || {}).slice(0, 1500)}\n关注点：${focus || '综合'}\n\n聊天记录：\n${transcript}`,
  });
  if (!r?.table) throw new Error('模型未返回有效表格');
  const saved = tables.add({ customer_id, title: r.table.title || `${customer.name} 多维分析`, columns: r.table.columns, rows: r.table.rows });
  return { table: saved, talk_guide: r.talk_guide };
}

/** 基于任意数据生成自定义表格 */
export function saveCustomTable({ customer_id, title, columns, rows }) {
  return tables.add({ customer_id, title, columns, rows });
}

// ---------- RFM 客户分层 ----------
// R=近度(距最近一次互动天数)，F=频次(聊天记录数/消息数)，M=金额代偿(预算/互动积极度)
const segInfo = {
  '重要价值': { idx: 1, desc: '高频高价值，重点维护' }, '重要发展': { idx: 2, desc: '潜力高，持续培育' },
  '重要保持': { idx: 3, desc: '曾高频，防止流失' }, '重要挽留': { idx: 4, desc: '价值高但活跃下降，重点挽回' },
  '一般价值': { idx: 5, desc: '中等，稳定跟进' }, '一般发展': { idx: 6, desc: '积极开发' },
  '一般保持': { idx: 7, desc: '低频，保持联系' }, '一般挽留': { idx: 8, desc: '低价值低频，观察' },
};

export function computeRFM(customer, records = []) {
  const last = records.map(r => r.created_at).sort((a, b) => b - a)[0];
  const recencyDays = last ? Math.max(0, Math.floor((Date.now() - last) / 864e5)) : 999;
  const frequency = Math.max(0, records.reduce((s, r) => s + (r.parsed?.length || 0), 0) || records.length);
  const budgetMap = { 高: 5, 中: 3, 低: 1 };
  const budget = budgetMap[customer.profile?.basic?.budget_level] ?? 2;
  const engagement = customer.profile?.behavior?.engagement != null ? customer.profile.behavior.engagement / 20 : 2;
  const monetary = Math.round(budget * 0.6 + Math.min(engagement, 5) * 0.4);

  const rScore = recencyDays <= 30 ? 5 : recencyDays <= 90 ? 4 : recencyDays <= 180 ? 3 : recencyDays <= 365 ? 2 : 1;
  const fScore = frequency >= 100 ? 5 : frequency >= 50 ? 4 : frequency >= 20 ? 3 : frequency >= 5 ? 2 : 1;
  const mScore = Math.max(1, Math.min(5, isNaN(monetary) ? 1 : monetary));

  const rf = `${rScore}${fScore}`;
  const segment = ({
    '55': '重要价值', '45': '重要价值', '54': '重要价值', '44': '重要发展', '53': '重要发展',
    '43': '重要发展', '51': '重要保持', '41': '重要保持', '31': '重要保持', '52': '重要挽留', '42': '重要挽留', '32': '重要挽留',
  }[rf]) || (fScore >= 4 ? '一般价值' : fScore === 3 ? '一般发展' : fScore === 2 ? '一般保持' : '一般挽留');

  return { recency_days: recencyDays, frequency, monetary, r: rScore, f: fScore, m: mScore, segment, segment_index: segInfo[segment].idx, segment_desc: segInfo[segment].desc, computed_at: Date.now() };
}

export function segmentAll(customers, recordsByCust = {}) {
  return customers.map(c => ({ id: c.id, name: c.name, company: c.company, ...computeRFM(c, recordsByCust[c.id] || []) })).sort((a, b) => a.segment_index - b.segment_index || b.monetary - a.monetary);
}

// ---------- 生成跟进邮件 / WhatsApp ----------
export async function generateFollowupMessage(customerId, { type = 'email', language = 'zh' }) {
  const cu = customers.get(customerId);
  if (!cu) throw new Error('客户不存在');
  const { transcript, records } = gatherCustomerContext(customerId, 7000);
  const langName = language === 'en' ? 'English' : '中文';
  const langRule = language === 'en'
    ? '强制要求：subject 与 body 必须全部使用 English 撰写（专业商务邮件/消息），不得出现中文。即使背景资料是中文，输出也必须为纯英文。'
    : '使用中文撰写，专业得体。';
  const typeLabel = type === 'whatsapp' ? 'WhatsApp' : 'Email';
  const r = await chatJSON({
    model: chatModel(),
    system: `你是外贸客户跟进专家。基于客户画像与近期聊天记录，输出一封可直接发送的${langName}${typeLabel}跟进内容。输出 JSON：
{
 "subject": "${type === 'email' ? '邮件主题（英文）' : '一句话标题'}",
 "body": "${type === 'email' ? '完整邮件正文（含称呼、正文、落款，专业礼貌）' : 'WhatsApp 消息（简洁自然，含 emoji 适量）'}",
 "tone": "语气说明",
 "key_points": ["3-5 个本次跟进要点"],
 "cta": "明确的行动号召（如约时间、回复报价）"
}
${langRule}`,
    user: `客户：${cu.name}${cu.company ? '（' + cu.company + '）' : ''}\n画像：${JSON.stringify(cu.profile || {}).slice(0, 2000)}\n忠诚度：${cu.loyalty?.score ?? '未'} (${cu.loyalty?.level ?? ''})${cu.loyalty?.next_contact ? `，建议${cu.loyalty.next_contact.timing}联系，话题：${cu.loyalty.next_contact.topic}` : ''}\n最近聊天：\n${transcript.slice(0, 5000)}`,
  });
  if (!r?.body) throw new Error('生成失败');
  r.language = language; r.type = type; r.customer = cu.name; r.customer_id = customerId;
  return r;
}
