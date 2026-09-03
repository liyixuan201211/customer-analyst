// 情感分析：对聊天记录做正负中性情绪统计
import { customers, chatRecords } from '../db/index.js';

const POS = ['好', '满意', '不错', '感谢', '谢谢', '靠谱', '专业', '喜欢', '赞', '棒', '放心', '稳定', '可以', '合作愉快', '值得', '认可', 'OK', 'ok', '期待'];
const NEG = ['投诉', '退款', '退货', '差', '太贵', '贵', '不要', '别家', '竞品', '失望', '不满', '不行', '太慢', '有问题', '损坏', '延迟', '不满意', '草率', '麻烦', '坑'];

function scoreText(text) {
  let pos = 0, neg = 0;
  for (const w of POS) if (text.includes(w)) pos++;
  for (const w of NEG) if (text.includes(w)) neg++;
  return { pos, neg };
}

export default function register(api) {
  const one = (cu) => {
    const recs = chatRecords.list(cu.id);
    let pos = 0, neg = 0, msgs = 0; const negSamples = [];
    for (const r of recs) {
      msgs += r.parsed?.length || 1;
      for (const line of (r.parsed || [{ text: r.content }])) {
        const t = line.text || r.content || '';
        const s = scoreText(t);
        pos += s.pos; neg += s.neg;
        if (s.neg > s.pos && t.length > 4) negSamples.push(t.trim().slice(0, 80));
      }
    }
    const total = pos + neg + 1;
    const score = Math.round(((pos - neg) / total) * 100);
    const sentiment = score > 20 ? 'positive' : score < -20 ? 'negative' : 'neutral';
    return { id: cu.id, name: cu.name, company: cu.company, positive: pos, negative: neg, messages: msgs, score, sentiment, negSamples: negSamples.slice(0, 5) };
  };
  const withSummary = (list) => ({ list, summary: {
    total: list.length,
    positive: list.filter(x => x.sentiment === 'positive').length,
    negative: list.filter(x => x.sentiment === 'negative').length,
    neutral: list.filter(x => x.sentiment === 'neutral').length,
    avg: list.length ? Math.round(list.reduce((a, b) => a + b.score, 0) / list.length) : 0,
  }});
  api.get('/sentiment', (c) => {
    const cs = customers.list();
    const q = c.req.query('q');
    return c.json(withSummary((q ? cs.filter(x => x.name.includes(q)) : cs).map(one)));
  });
  api.get('/sentiment/:id', (c) => { const cu = customers.get(c.req.param('id')); if (!cu) return c.json({ error: 'not found' }, 404); return c.json(one(cu)); });
}
