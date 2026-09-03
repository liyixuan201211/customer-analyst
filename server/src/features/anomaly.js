// 异常检测：库存承诺/价格倒挂/重复客户/逾期跟进
import { customers, products, orders, followups } from '../db/index.js';

export default function register(api) {
  api.get('/anomaly', (c) => {
    const res = [];
    const ps = products.list();
    const cs = customers.list();
    const fuAll = followups.list({});

    // 价格倒挂
    for (const p of ps) if (+p.current_price < +p.cost) res.push({ type: 'price_inversion', severity: 'high', message: `商品「${p.name}」现价 ¥${p.current_price} 低于成本 ¥${p.cost}（倒挂）`, refId: p.id });

    // 库存承诺风险：库存低于安全库存或为 0
    for (const p of ps) if (p.min_stock > 0 && p.stock < p.min_stock) {
      const promised = orders.list({ product_id: p.id }).filter(o => o.status !== 'cancelled').length;
      res.push({ type: 'lowstock_promise', severity: p.stock <= 0 ? 'high' : 'med', message: `商品「${p.name}」库存 ${p.stock}${p.unit} 低于安全库存 ${p.min_stock}${promised ? `，且有 ${promised} 笔在途订单` : ''}`, refId: p.id });
    }

    // 重复客户（同名或同公司）
    const seen = new Map();
    for (const cu of cs) {
      const key = (cu.company || cu.name).trim();
      if (!key) continue;
      seen.set(key, (seen.get(key) || []).concat(cu));
    }
    for (const [k, arr] of seen) if (arr.length > 1) res.push({ type: 'duplicate_customer', severity: 'med', message: `存在 ${arr.length} 个重名/同公司客户「${k}」（${arr.map(x => x.name).join('、')}），建议合并`, refId: arr[0].id });

    // 逾期跟进超 3 天
    const now = Date.now();
    for (const f of fuAll) if (f.status === 'pending' && f.due_at && now - f.due_at > 3 * 864e5) {
      res.push({ type: 'overdue_followup', severity: 'high', message: `跟进任务「${f.subject || f.type}」已逾期 ${Math.floor((now - f.due_at) / 864e5)} 天（${f.customer_name || '无客户'}）`, refId: f.id });
    }

    const sev = { high: 0, med: 0, low: 0 };
    res.forEach(a => { sev[a.severity] = (sev[a.severity] || 0) + 1; });
    return c.json({ items: res, count: res.length, bySeverity: sev });
  });
  // 单独检索某客户
  api.get('/anomaly/customer/:id', (c) => {
    const cu = customers.get(c.req.param('id')); if (!cu) return c.json({ error: 'not found' }, 404);
    const pItems = products.list().filter(p => p.stock < (p.min_stock || 0));
    const fu = followups.list({ customer_id: cu.id }).filter(f => f.status === 'pending' && f.due_at && Date.now() - f.due_at > 864e5);
    return c.json({ items: [...pItems.map(p => ({ type: 'lowstock_promise', severity: p.stock <= 0 ? 'high' : 'med', message: `库存不足：${p.name} ${p.stock}`, refId: p.id })), ...fu.map(f => ({ type: 'overdue_followup', severity: 'high', message: `逾期跟进：${f.subject || f.type}`, refId: f.id }))] });
  });
}
