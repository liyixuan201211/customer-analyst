// 客户分群/聚类：基于画像特征做轻量 k-means 分群，支持批量运营
import { customers, chatRecords, orders, followups } from '../db/index.js';
import { computeRFM } from '../tools/analysis.js';

function feats(cu, records, fu) {
  const rfm = computeRFM(cu, records);
  const orderAmt = orders.totalByCustomer(cu.id).amount;
  return { price: (cu.profile?.price_sensitivity?.level === '高' ? 3 : cu.profile?.price_sensitivity?.level === '低' ? 1 : 2), budget: ({ 高: 3, 中: 2, 低: 1 }[cu.profile?.basic?.budget_level] ?? 2), engagement: (cu.profile?.behavior?.engagement ?? 50) / 100, loyalty: (cu.loyalty?.score ?? 50) / 100, rfm_m: rfm.m / 5, order: orderAmt > 0 ? 1 : 0 };
}
const K = 4;
function kmeans(points, k) {
  if (points.length <= k) return points.map((p, i) => ({ centroid: p, cluster: i }));
  let centroids = points.slice(0, k).map(p => [...p]);
  let assign = points.map(() => 0);
  for (let it = 0; it < 8; it++) {
    assign = points.map(p => { let best = 0, bd = Infinity; centroids.forEach((c, i) => { const d = p.reduce((s, v, j) => s + (v - c[j]) ** 2, 0); if (d < bd) { bd = d; best = i; } }); return best; });
    centroids = centroids.map((_, i) => { const g = points.filter((_, j) => assign[j] === i); if (!g.length) return centroids[i]; const n = g.length; return g[0].map((_, j) => g.reduce((s, p) => s + p[j], 0) / n); });
  }
  return points.map((p, i) => ({ centroid: p, cluster: assign[i] }));
}
const NAME = (c) => c[0] >= 2.5 && c[1] >= 2.5 ? '高价值·高预算' : c[0] >= 2.5 && c[4] < 0.5 ? '价格敏感·价值型' : c[3] < 0.5 ? '忠诚度偏低·需挽回' : c[5] === 0 ? '潜力开发' : '稳定成交型';

export default function register(api) {
  api.get('/segments', (c) => {
    const cs = customers.list();
    const rows = cs.map(cu => { const recs = chatRecords.list(cu.id); return { cu, f: feats(cu, recs, followups.list({})) }; });
    const pts = rows.map(r => r.f).map(f => [f.price, f.budget, f.engagement, f.loyalty, f.rfm_m, f.order]);
    const clustered = kmeans(pts, K);
    const groups = Array.from({ length: K }, (_, i) => ({ cluster: i, members: [] }));
    clustered.forEach((c, i) => groups[c.cluster].members.push(rows[i].cu));
    const segments = groups.filter(g => g.members.length).map(g => { const avg = g.members.reduce((a, x) => { const f = feats(x, chatRecords.list(x.id), followups.list({})); return { p: a.p + f.price, b: a.b + f.budget, l: a.l + f.loyalty, o: a.o + f.order }; }, { p: 0, b: 0, l: 0, o: 0 }); const n = g.members.length || 1; const ctr = [avg.p / n, avg.b / n]; return { cluster: g.cluster, name: NAME(ctr), label: NAME(ctr), count: g.members.length, members: g.members.map(x => ({ id: x.id, name: x.name, company: x.company, tags: x.tags })) }; });
    return c.json({ segments, total: cs.length });
  });
  api.get('/segments/export', (c) => { const seg = []; return c.json(seg); });
}
