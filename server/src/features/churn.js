// 流失预测（规则+统计：沉默天数/负面信号/价格敏感/忠诚度低/无跟进）
import { customers, chatRecords, followups } from '../db/index.js';

const NEG_WORDS = ['投诉', '退款', '退货', '差', '太贵', '贵', '不要', '别家', '竞品', '对比', '再想想', '算了', '失望', '不满', '换', '取消', '解约', '终止'];

export default function register(api) {
  const computeOne = (cu) => {
    const records = chatRecords.list(cu.id);
    const fuAll = followups.list({});
    const last = records.map(r => r.created_at).sort((a, b) => b - a)[0];
    const silentDays = last ? Math.floor((Date.now() - last) / 864e5) : 999;
    const text = records.map(r => r.content).join('\n');
    let neg = 0; const negSamples = [];
    for (const w of NEG_WORDS) { const n = (text.match(new RegExp(w, 'g')) || []).length; if (n > 0) { neg += n; negSamples.push(w + '×' + n); } }
    const priceSens = cu.profile?.price_sensitivity?.level === '高';
    const loyalty = cu.loyalty?.score ?? null;
    const noFollowup = !fuAll.some(f => f.customer_id === cu.id && f.status === 'pending');

    let score = 0;
    score += Math.min(40, silentDays / 10);
    score += Math.min(30, neg * 6);
    if (priceSens) score += 10;
    if (loyalty != null && loyalty < 50) score += 15; else if (loyalty != null && loyalty < 70) score += 6;
    if (noFollowup && silentDays > 30) score += 10;
    if (cu.profile?.decision?.urgency === '低') score += 5;
    score = Math.min(100, Math.round(score));
    const risk = score >= 70 ? 'high' : score >= 45 ? 'med' : 'low';
    const suggestion = risk === 'high' ? '立即电话回访，给出挽回方案并了解流失原因'
      : risk === 'med' ? '本周内主动联系，提供专属优惠或新品试用' : '保持常规跟进，触发式维护';
    return { id: cu.id, name: cu.name, company: cu.company, score, risk, silent_days: silentDays, negative_count: neg,
      signals: [...negSamples, silentDays > 30 ? '长期未互动' : '', priceSens ? '价格敏感' : '', loyalty != null && loyalty < 50 ? '忠诚度偏低' : ''].filter(Boolean), suggestion };
  };

  api.get('/churn', (c) => {
    const list = customers.list().map(computeOne).sort((a, b) => b.score - a.score);
    return c.json({ list, high: list.filter(x => x.risk === 'high').slice(0, 5),
      summary: { total: list.length, high: list.filter(x => x.risk === 'high').length, avg: list.length ? Math.round(list.reduce((a, b) => a + b.score, 0) / list.length) : 0 } });
  });
  api.get('/churn/:id', (c) => { const cu = customers.get(c.req.param('id')); if (!cu) return c.json({ error: 'not found' }, 404); return c.json(computeOne(cu)); });
}
