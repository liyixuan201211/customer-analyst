// Agent 工具集：暴露给大模型的函数定义 + 执行器
import { customers, chatRecords, tables, products, staff, kb, followups } from '../db/index.js';
import { webSearch, fetchPage } from '../tools/web.js';
import { searchKnowledge, ingestDocument } from '../tools/knowledge.js';
import { parseChatText, toTranscript, saveRecord, guessCustomerName } from '../tools/importer.js';
import { buildProfile, analyzeLoyalty, buildTableAndAdvice, saveCustomTable, computeRFM, generateFollowupMessage } from '../tools/analysis.js';
import { computePrice, pricingForCustomer, explainPricing } from '../tools/pricing.js';
import { generateImage } from '../llm/aiping.js';
import { activity } from '../auth.js';

const dedupe = (a) => [...new Set(a)];

const T = (name, description, properties, required = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

export const TOOL_DEFS = [
  // ---- 客户 ----
  T('list_customers', '列出/搜索客户档案（含标签、是否已有画像/忠诚度）', { query: { type: 'string', description: '按名称/公司/电话模糊搜索，可为空' } }),
  T('get_customer', '获取客户完整档案：画像、忠诚度、聊天记录摘要、已生成表格', { customer_id: { type: 'string', description: '客户 ID 或客户名称' } }, ['customer_id']),
  T('create_customer', '新建客户档案', { name: { type: 'string' }, company: { type: 'string' }, phone: { type: 'string' }, notes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, ['name']),
  T('update_customer', '更新客户档案字段', { customer_id: { type: 'string' }, name: { type: 'string' }, company: { type: 'string' }, phone: { type: 'string' }, notes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, ['customer_id']),

  // ---- 聊天记录导入 ----
  T('import_chat_text', '把一段聊天记录文本（微信/QQ/钉钉导出或任意"说话人: 内容"格式）解析并保存到客户档案。若用户在消息中直接粘贴了聊天记录，用此工具导入。', {
    text: { type: 'string', description: '聊天记录原文' },
    customer_name: { type: 'string', description: '客户名称；不填则自动识别' },
    customer_id: { type: 'string', description: '已有客户 ID（优先）' },
  }, ['text']),
  T('get_chat_records', '读取客户的全部聊天记录原文（用于回答细节问题）', { customer_id: { type: 'string' }, max_chars: { type: 'number' } }, ['customer_id']),

  // ---- 分析 ----
  T('analyze_profile', '基于聊天记录生成/刷新客户深层画像（DISC 性格、需求、痛点、决策链、价格敏感度、风险机会等），结果会展示在右侧面板', { customer_id: { type: 'string' }, extra: { type: 'string', description: '补充背景信息' } }, ['customer_id']),
  T('analyze_loyalty', '进行客户忠诚度分析（6 维评分、流失风险、生命周期、维系动作、下次联系建议），结果会展示在右侧面板', { customer_id: { type: 'string' } }, ['customer_id']),
  T('generate_table_and_advice', '产出多维分析表格 + 建议对话方式（语气、Do/Don\'t、开场白、异议处理、促成话术、场景脚本）', { customer_id: { type: 'string' }, focus: { type: 'string', description: '本次关注重点，如"报价谈判"' } }, ['customer_id']),
  T('create_table', '把任意结构化数据保存为表格并在右侧展示（用于对比、汇总、清单等）', {
    title: { type: 'string' },
    columns: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, label: { type: 'string' } }, required: ['key', 'label'] } },
    rows: { type: 'array', items: { type: 'object' } },
    customer_id: { type: 'string' },
  }, ['title', 'columns', 'rows']),

  // ---- 知识库 / 搜索 ----
  T('search_knowledge', '在公司知识库（产品资料、话术、FAQ、案例等）中语义检索', { query: { type: 'string' }, top_k: { type: 'number' } }, ['query']),
  T('add_knowledge', '把一段文本存入知识库供后续检索', { title: { type: 'string' }, text: { type: 'string' } }, ['title', 'text']),
  T('web_search', '联网搜索最新信息（行业动态、竞品、客户公司背景、市场价格等）', { query: { type: 'string' }, limit: { type: 'number' } }, ['query']),
  T('fetch_webpage', '抓取指定网页正文以获取详细内容', { url: { type: 'string' } }, ['url']),

  // ---- 定价 / 货物 ----
  T('list_products', '列出/搜索商品（含成本、基准价、现价、库存、安全库存）', { query: { type: 'string' } }),
  T('upsert_product', '新增或更新商品', { id: { type: 'string', description: '更新时提供 ID/SKU/名称' }, sku: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' }, cost: { type: 'number' }, base_price: { type: 'number' }, current_price: { type: 'number' }, stock: { type: 'number' }, min_stock: { type: 'number' }, unit: { type: 'string' } }),
  T('dynamic_pricing', '对商品进行动态定价分析：综合库存、需求热度、客户忠诚度/价格敏感度、竞品价、季节等因子，输出建议价、价格分布（底价/建议/挂牌/上限）与客户分层价，结果展示在右侧面板', {
    product_id: { type: 'string', description: '商品 ID/SKU/名称' },
    customer_id: { type: 'string', description: '可选：针对特定客户定价（自动引入其忠诚度与价格敏感度）' },
    demand: { type: 'number', description: '需求热度 0-2，1 为正常' },
    competitor_price: { type: 'number' },
    season: { type: 'number', description: '季节/活动系数 0.8-1.2' },
    apply: { type: 'boolean', description: '是否直接把建议价写入商品现价' },
    reason: { type: 'string' },
  }, ['product_id']),
  T('adjust_stock', '库存出入库（正数入库，负数出库）', { product_id: { type: 'string' }, delta: { type: 'number' }, reason: { type: 'string' }, operator: { type: 'string' } }, ['product_id', 'delta']),
  T('inventory_report', '库存健康报告：低库存预警、积压、周转建议', {}),

  // ---- 人员 ----
  T('list_staff', '列出员工及其负责客户数', {}),
  T('upsert_staff', '新增/更新员工', { id: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' }, department: { type: 'string' }, phone: { type: 'string' }, status: { type: 'string', enum: ['active', 'leave', 'inactive'] }, skills: { type: 'array', items: { type: 'string' } } }),
  T('assign_customer', '把客户分配给员工跟进（或解除分配）', { staff_id: { type: 'string', description: '员工 ID 或姓名' }, customer_id: { type: 'string' }, unassign: { type: 'boolean' }, note: { type: 'string' } }, ['staff_id', 'customer_id']),
  T('recommend_staff', '根据客户画像推荐最合适的跟进员工（技能匹配 + 负载均衡）', { customer_id: { type: 'string' } }, ['customer_id']),

  // ---- 生成 ----
  T('generate_image', '生成营销海报/示意图（文生图）', { prompt: { type: 'string' }, size: { type: 'string', description: '如 1024x1024' } }, ['prompt']),

  // ---- 分析增强 / 跟进（RFM、跟进任务、跟进消息） ----
  T('analyze_rfm', '对客户做 RFM 分层分析（近度/频次/金额），输出分层结果与跟进策略', { customer_id: { type: 'string' } }, ['customer_id']),
  T('create_followup', '为客户创建一条跟进任务（电话/邮件/WhatsApp/面谈），可设定截止时间', {
    customer_id: { type: 'string' }, type: { type: 'string', enum: ['call', 'email', 'whatsapp', 'meeting', 'other'] },
    subject: { type: 'string' }, note: { type: 'string' }, due_at: { type: 'number', description: '截止时间戳(ms)' }, assignee_name: { type: 'string' },
  }, ['customer_id']),
  T('list_followups', '列出跟进任务（可按状态：pending/today/overdue/upcoming/done，或按客户/跟进人）', { status: { type: 'string' }, customer_id: { type: 'string' }, assignee_id: { type: 'string' } }),
  T('complete_followup', '把跟进任务标记为已完成', { followup_id: { type: 'string' } }, ['followup_id']),
  T('generate_followup_message', '生成一封可直接发送的跟进邮件或 WhatsApp（支持中/英文），用于外贸客户跟进', {
    customer_id: { type: 'string' }, type: { type: 'string', enum: ['email', 'whatsapp'] }, language: { type: 'string', enum: ['zh', 'en'] },
  }, ['customer_id']),
];

const resolveCustomer = (idOrName) => {
  if (!idOrName) return null;
  return customers.get(idOrName) || customers.findByName(idOrName) || customers.list(idOrName)[0] || null;
};
const short = (c) => ({ id: c.id, name: c.name, company: c.company, tags: c.tags, has_profile: !!c.profile, loyalty_score: c.loyalty?.score ?? null, loyalty_level: c.loyalty?.level ?? null });

/**
 * 执行工具。返回 { result, panel? }：panel 用于通知前端右侧栏切换/刷新
 */
export async function runTool(name, args = {}, ctx = {}) {
  switch (name) {
    case 'list_customers': return { result: customers.list(args.query).map(short) };
    case 'get_customer': {
      const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } };
      const recs = chatRecords.list(c.id);
      return { result: { ...c, records: recs.map(r => ({ id: r.id, source: r.source, file_name: r.file_name, messages: r.parsed?.length || 0, preview: r.content.slice(0, 300) })), tables: tables.list(c.id).map(t => ({ id: t.id, title: t.title, rows: t.rows.length })) }, panel: { view: 'customer', customer_id: c.id } };
    }
    case 'create_customer': { const c = customers.create(args); return { result: short(c), panel: { view: 'customer', customer_id: c.id } }; }
    case 'update_customer': { const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } }; const { customer_id, ...patch } = args; return { result: short(customers.update(c.id, patch)), panel: { view: 'customer', customer_id: c.id } }; }

    case 'import_chat_text': {
      const parsed = parseChatText(args.text);
      const content = toTranscript(parsed);
      let cid = resolveCustomer(args.customer_id)?.id;
      let cname = args.customer_name;
      if (!cid && !cname) cname = await guessCustomerName(content);
      const r = saveRecord({ customer_id: cid, customer_name: cname, source: 'text', content, parsed });
      return { result: { record_id: r.id, customer_id: r.customer_id, messages: parsed.length, speakers: [...new Set(parsed.map(m => m.speaker).filter(Boolean))] }, panel: { view: 'customer', customer_id: r.customer_id } };
    }
    case 'get_chat_records': {
      const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } };
      const recs = chatRecords.list(c.id);
      let text = recs.map(r => `===== ${r.file_name || r.source} =====\n${r.content}`).join('\n\n');
      const max = args.max_chars || 15000; if (text.length > max) text = text.slice(0, max) + '\n...(截断)';
      return { result: { customer: c.name, records: recs.length, text } };
    }

    case 'analyze_profile': { const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } }; const p = await buildProfile(c.id, args.extra); return { result: p, panel: { view: 'customer', customer_id: c.id, tab: 'profile' } }; }
    case 'analyze_loyalty': { const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } }; const l = await analyzeLoyalty(c.id); return { result: l, panel: { view: 'customer', customer_id: c.id, tab: 'loyalty' } }; }
    case 'generate_table_and_advice': { const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } }; const r = await buildTableAndAdvice(c.id, args.focus); return { result: r, panel: { view: 'table', table_id: r.table.id, customer_id: c.id, talk_guide: r.talk_guide } }; }
    case 'create_table': { const c = resolveCustomer(args.customer_id); const t = saveCustomTable({ customer_id: c?.id, title: args.title, columns: args.columns, rows: args.rows }); return { result: { table_id: t.id, rows: t.rows.length }, panel: { view: 'table', table_id: t.id } }; }

    case 'search_knowledge': { const hits = await searchKnowledge(args.query, args.top_k || 6); return { result: hits.length ? hits : { info: '知识库无相关内容或知识库为空' }, panel: { view: 'knowledge', hits } }; }
    case 'add_knowledge': { const r = await ingestDocument({ title: args.title, text: args.text, source: 'agent' }); return { result: r, panel: { view: 'knowledge' } }; }
    case 'web_search': { const r = await webSearch(args.query, args.limit || 6); return { result: r, panel: { view: 'web', query: args.query, ...r } }; }
    case 'fetch_webpage': { const r = await fetchPage(args.url); return { result: r }; }

    case 'list_products': return { result: products.list(args.query), panel: { view: 'inventory' } };
    case 'upsert_product': {
      const existing = args.id ? products.get(args.id) : (args.sku && products.get(args.sku)) || (args.name && products.get(args.name));
      const p = existing ? products.update(existing.id, args) : products.create(args);
      return { result: p, panel: { view: 'inventory' } };
    }
    case 'dynamic_pricing': {
      const p = products.get(args.product_id); if (!p) return { result: { error: '商品不存在' } };
      const c = resolveCustomer(args.customer_id);
      const opts = { ...pricingForCustomer(p, c), demand: args.demand, competitor_price: args.competitor_price, season: args.season };
      const r = computePrice(p, opts);
      r.explanation = await explainPricing(r, c ? `客户 ${c.name}：${c.profile?.summary || ''}` : '');
      if (args.apply) products.setPrice(p.id, r.suggested_price, args.reason || '智能体动态定价', r.factors);
      return { result: r, panel: { view: 'pricing', pricing: r, customer_id: c?.id, applied: !!args.apply } };
    }
    case 'adjust_stock': { const p = products.get(args.product_id); if (!p) return { result: { error: '商品不存在' } }; return { result: products.moveStock(p.id, Math.round(args.delta), args.reason, args.operator || ctx.operator), panel: { view: 'inventory' } }; }
    case 'inventory_report': {
      const all = products.list();
      const low = all.filter(p => p.min_stock > 0 && p.stock < p.min_stock);
      const over = all.filter(p => p.min_stock > 0 && p.stock > p.min_stock * 4);
      const value = all.reduce((s, p) => s + p.stock * p.cost, 0);
      return { result: { total_skus: all.length, inventory_value: +value.toFixed(2), low_stock: low.map(p => ({ name: p.name, stock: p.stock, min_stock: p.min_stock })), overstock: over.map(p => ({ name: p.name, stock: p.stock, min_stock: p.min_stock })) }, panel: { view: 'inventory' } };
    }

    case 'list_staff': return { result: staff.list(), panel: { view: 'staff' } };
    case 'upsert_staff': { const ex = args.id ? staff.get(args.id) : (args.name && staff.get(args.name)); const s = ex ? staff.update(ex.id, args) : staff.create(args); return { result: s, panel: { view: 'staff' } }; }
    case 'assign_customer': {
      const s = staff.get(args.staff_id), c = resolveCustomer(args.customer_id);
      if (!s || !c) return { result: { error: !s ? '员工不存在' : '客户不存在' } };
      if (args.unassign) staff.unassign(s.id, c.id); else staff.assign(s.id, c.id, args.note);
      return { result: { ok: true, staff: s.name, customer: c.name, unassigned: !!args.unassign }, panel: { view: 'staff' } };
    }
    case 'recommend_staff': {
      const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } };
      const list = staff.list().filter(s => s.status === 'active');
      const tags = new Set([...(c.tags || []), c.profile?.basic?.industry, c.profile?.personality?.type].filter(Boolean).map(t => String(t).toLowerCase()));
      const scored = list.map(s => {
        const match = s.skills.filter(k => [...tags].some(t => t.includes(k.toLowerCase()) || k.toLowerCase().includes(t))).length;
        return { id: s.id, name: s.name, role: s.role, workload: s.workload, skill_match: match, score: match * 10 - s.workload };
      }).sort((a, b) => b.score - a.score);
      return { result: { customer: c.name, recommendations: scored.slice(0, 3) }, panel: { view: 'staff' } };
    }
    case 'generate_image': { const urls = await generateImage({ prompt: args.prompt, size: args.size }); return { result: { images: urls }, panel: { view: 'image', images: urls, prompt: args.prompt } }; }
    case 'analyze_rfm': {
      const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } };
      const r = computeRFM(c, chatRecords.list(c.id));
      customers.update(c.id, { tags: dedupe([...((c.tags || [])), `${r.segment}`]) });
      return { result: r, panel: { view: 'customer', customer_id: c.id, tab: 'rfm' } };
    }
    case 'create_followup': {
      const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } };
      const f = followups.create({ customer_id: c.id, type: args.type, subject: args.subject, note: args.note, due_at: args.due_at, assignee_name: args.assignee_name || ctx.actor_name, created_by: ctx.actor_id });
      if (ctx.actor) activity.log(ctx.actor, 'add', 'followup', f.id, `跟进 ${f.type}: ${f.subject || ''}`);
      return { result: f, panel: { view: 'followups' } };
    }
    case 'list_followups': { const list = followups.list({ status: args.status, customer_id: resolveCustomer(args.customer_id)?.id }); return { result: list, panel: { view: 'followups' } }; }
    case 'complete_followup': { const f = followups.setStatus(args.followup_id, 'done'); activity.log(ctx.actor, 'update', 'followup', args.followup_id, '完成跟进任务'); return { result: f, panel: { view: 'followups' } }; }
    case 'generate_followup_message': {
      const c = resolveCustomer(args.customer_id); if (!c) return { result: { error: '客户不存在' } };
      const msg = await generateFollowupMessage(c.id, { type: args.type || 'email', language: args.language || (ctx.locale === 'en-US' ? 'en' : 'zh') });
      return { result: msg, panel: { view: 'followups', message: msg, customer_id: c.id } };
    }
    default: return { result: { error: `未知工具 ${name}` } };
  }
}
