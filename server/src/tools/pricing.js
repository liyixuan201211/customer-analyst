// 动态定价：基于库存、成本、客户忠诚度/价格敏感度、需求热度的规则引擎 + 可选模型解释
import { products, customers, getSetting } from '../db/index.js';
import { chatJSON, DEFAULTS } from '../llm/aiping.js';

/**
 * 计算建议价格与各因子贡献。
 * factors: { stock_ratio, demand(0-2), loyalty(0-100), price_sensitivity(高/中/低), competitor_price, season(0.8-1.2), urgency(高/中/低) }
 */
export function computePrice(product, opts = {}) {
  const base = product.base_price || product.current_price || 0;
  const cost = product.cost || 0;
  const min = Math.max(cost * (1 + (opts.min_margin ?? 0.08)), 0); // 最低毛利 8%
  const factors = [];

  // 库存压力：库存越高越降价，低于安全库存则涨价
  const stockRatio = product.min_stock > 0 ? product.stock / product.min_stock : (product.stock > 0 ? 2 : 0.5);
  let stockAdj = 0;
  if (stockRatio > 4) stockAdj = -0.08;
  else if (stockRatio > 2.5) stockAdj = -0.04;
  else if (stockRatio < 0.8) stockAdj = +0.06;
  else if (stockRatio < 1.2) stockAdj = +0.03;
  factors.push({ name: '库存压力', value: `${product.stock}/${product.min_stock || '-'}`, adj: stockAdj });

  // 需求热度
  const demand = Math.min(Math.max(+opts.demand || 1, 0), 2);
  const demandAdj = (demand - 1) * 0.10;
  factors.push({ name: '需求热度', value: demand.toFixed(2), adj: demandAdj });

  // 客户忠诚度：高忠诚客户给让利（维系），低忠诚且价格敏感也让利（促成），中间不变
  let loyaltyAdj = 0;
  if (opts.loyalty != null) {
    const l = +opts.loyalty;
    if (l >= 80) loyaltyAdj = -0.05;
    else if (l >= 60) loyaltyAdj = -0.02;
    else if (l < 40) loyaltyAdj = -0.03;
    factors.push({ name: '客户忠诚度', value: l, adj: loyaltyAdj });
  }
  // 价格敏感度
  let sensAdj = 0;
  if (opts.price_sensitivity) {
    sensAdj = { 高: -0.04, 中: 0, 低: +0.03 }[opts.price_sensitivity] ?? 0;
    factors.push({ name: '价格敏感度', value: opts.price_sensitivity, adj: sensAdj });
  }
  // 竞品价
  let compAdj = 0;
  if (opts.competitor_price > 0 && base > 0) {
    const gap = (opts.competitor_price - base) / base;
    compAdj = Math.max(-0.10, Math.min(0.08, gap * 0.5));
    factors.push({ name: '竞品价格', value: opts.competitor_price, adj: compAdj });
  }
  // 季节/活动
  if (opts.season && opts.season !== 1) {
    factors.push({ name: '季节/活动系数', value: opts.season, adj: +opts.season - 1 });
  }
  // 客户紧迫度
  let urgAdj = 0;
  if (opts.urgency) { urgAdj = { 高: +0.03, 中: 0, 低: -0.02 }[opts.urgency] ?? 0; factors.push({ name: '客户紧迫度', value: opts.urgency, adj: urgAdj }); }

  const totalAdj = factors.reduce((s, f) => s + f.adj, 0);
  let price = base * (1 + totalAdj);
  price = Math.max(price, min);
  price = Math.round(price * 100) / 100;

  // 分布：给出阶梯（底价/建议/挂牌/上限）
  const distribution = {
    floor: Math.round(min * 100) / 100,
    suggested: price,
    list: Math.round(price * 1.06 * 100) / 100,
    ceiling: Math.round(Math.max(price * 1.15, base * 1.1) * 100) / 100,
    margin: base ? +(((price - cost) / price) * 100).toFixed(1) : null,
  };
  // 按客户分层的价格分布
  const tiers = [
    { tier: '铁杆/忠诚客户', price: Math.round(Math.max(price * 0.95, min) * 100) / 100 },
    { tier: '普通客户', price },
    { tier: '新客户', price: Math.round(price * 1.03 * 100) / 100 },
    { tier: '价格敏感/摇摆', price: Math.round(Math.max(price * 0.97, min) * 100) / 100 },
  ];
  return { product_id: product.id, product: product.name, base_price: base, cost, current_price: product.current_price, suggested_price: price, total_adjustment: +(totalAdj * 100).toFixed(1), factors, distribution, tiers };
}

export function pricingForCustomer(product, customer) {
  const opts = {};
  if (customer?.loyalty?.score != null) opts.loyalty = customer.loyalty.score;
  if (customer?.profile?.price_sensitivity?.level) opts.price_sensitivity = customer.profile.price_sensitivity.level;
  if (customer?.profile?.decision?.urgency) opts.urgency = customer.profile.decision.urgency;
  return opts;
}

export async function explainPricing(result, context = '') {
  const r = await chatJSON({
    model: getSetting('models', {}).chat || DEFAULTS.chat,
    system: '你是定价策略顾问。根据定价计算结果，用简洁中文给出 {"rationale":"定价理由(80字内)","risks":["风险"],"tactics":["报价/谈判技巧 2-3 条"]}。',
    user: `定价结果：${JSON.stringify(result)}\n背景：${context}`,
  });
  return r || {};
}
