// 演示数据种子：`cd server && node --env-file=../.env seed.js`
// 生成一批示例客户/订单/商品/员工/跟进，方便开箱即用。幂等（已存在则跳过）。
process.chdir(import.meta.dirname);
import { customers, chatRecords, products, staff, followups, orders } from './src/db/index.js';
import { ensureAdmin } from './src/auth.js';
import { ingestDocument } from './src/tools/knowledge.js';

const now = Date.now();
const day = 864e5;

ensureAdmin();

const demoCustomers = [
  { name: '王经理', company: '华信工业', phone: '13800000001', tags: ['工业客户', '老客户', '温控器'], transcript: '王经理: 你们那个工业级温控器还有货吗？上次那批用得不错\n我: 王总早！有货的，现在库存充足。您这次大概需要多少？\n王经理: 先要200台吧，不过价格能不能再优惠点？隔壁厂报给我的比你们低8个点\n我: 王总您是老客户，我跟领导申请一下，尽量给您争取。质量上我们肯定比他们稳定\n王经理: 质量确实没话说，就是现在原材料涨价，我们成本压力也大。下周开生产会' },
  { name: '陈总', company: '华信贸易', phone: '13800000002', tags: ['老客户', '贸易'], transcript: '陈总: 你们的报价单我看了，运费怎么还要另算？\n我: 陈总，满5万我们包运费的，您这单差一点点\n陈总: 那我再加10箱凑一下，下次别这样了，合作两年了还算这么细\n我: 好的陈总，我给您走老客户通道，明天发货' },
  { name: 'Emily (US Buyer)', company: 'ABC Trading LLC', phone: '+1-202-555-0100', tags: ['外贸', '新客户'], transcript: 'Emily: Hi, do you ship to the US? What is the MOQ for the thermostat?\n我: Hello Emily! Yes we ship worldwide, MOQ is 100 pcs. I can send you a quote.\nEmily: Please also share the datasheet and lead time.' },
];

for (const d of demoCustomers) {
  if (!customers.findByName(d.name)) {
    const c = customers.create({ name: d.name, company: d.company, phone: d.phone, tags: d.tags });
    chatRecords.add({ customer_id: c.id, source: 'text', file_name: 'demo.txt', content: d.transcript, parsed: d.transcript.split('\n').map(line => { const m = line.split(/[:：]\s/); return { speaker: m[0], text: m[1] || '', time: '' }; }) });
  }
}

if (!products.list().length) {
  products.create({ sku: 'TC-100', name: '工业级温控器', category: '温控设备', cost: 180, base_price: 268, stock: 1500, min_stock: 300 });
  products.create({ sku: 'TC-300', name: '智能温控器V3(远程监控)', category: '温控设备', cost: 320, base_price: 498, stock: 120, min_stock: 200 });
}
if (!staff.list().length) {
  staff.create({ name: '小李', role: '销售经理', department: '销售一部', skills: ['工业客户', '大客户'] });
  staff.create({ name: '小张', role: '销售专员', department: '销售二部', skills: ['新客户开发'] });
}
const wang = customers.findByName('王经理');
if (wang && !orders.list({ customer_id: wang.id }).length) {
  orders.create({ customer_id: wang.id, product_name: '工业级温控器', qty: 200, unit_price: 228, status: 'paid', order_date: now - 5 * day });
}
if (wang && !followups.list({ customer_id: wang.id }).length) {
  followups.create({ customer_id: wang.id, type: 'call', subject: '报价跟进（远程监控款）', note: '周四前给方案，主推减少巡检成本', due_at: now + day });
}

try {
  const kb = await ingestDocument({ title: '温控器报价政策', text: '工业级温控器 TC-100 基准价 268 元/台。\n批量政策：100 台以上 95 折，300 台以上 9 折，500 台以上 88 折。\n老客户（合作满一年）额外享 2 个点让利，须经销售总监审批。\n智能温控器 V3 支持远程监控与云端告警，可减少 60% 人工巡检，基准价 498 元/台。' });
  console.log('[seed] 知识库已入库', kb.chunks, '片段');
} catch (e) { console.warn('[seed] 知识库入库失败（可略）：', e.message); }

console.log('[seed] 完成：演示客户/订单/商品/员工/跟进 已生成。');
