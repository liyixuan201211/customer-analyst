// 多语种生成跟进邮件/WhatsApp（外贸多语言）
import { customers } from '../db/index.js';
import { generateFollowupMessage, gatherCustomerContext } from '../tools/analysis.js';
import { chatJSON, DEFAULTS } from '../llm/aiping.js';

const LANGS = [
  ['zh', '中文', 'Chinese'], ['en', 'English', 'English'], ['es', 'Español', 'Spanish'], ['fr', 'Français', 'French'],
  ['de', 'Deutsch', 'German'], ['ru', 'Русский', 'Russian'], ['ar', 'العربية', 'Arabic'], ['pt', 'Português', 'Portuguese'], ['ja', '日本語', 'Japanese'],
];
const LANG_NAME = Object.fromEntries(LANGS.map(([c, n, e]) => [c, e]));

export default function register(api) {
  api.get('/translate/langs', (c) => c.json(LANGS.map(([code, label, en]) => ({ code, label, name: en }))));
  api.post('/translate', async (c) => {
    const { customer_id, type = 'email', language = 'en', text } = await c.req.json().catch(() => ({}));
    const langName = LANG_NAME[language] || language;
    if (text) {
      // 直接翻译给定文本
      const r = await chatJSON({ model: DEFAULTS.chat, temperature: 0.2, system: `你是专业翻译。把用户文本翻译成${langName}，风格保留原意。只输出翻译结果。`, user: text });
      return c.json({ language, type, subject: '', body: typeof r === 'string' ? r : (r?.translation || text), tone: '', key_points: [], cta: '' });
    }
    if (!customer_id) return c.json({ error: '缺少客户或文本' }, 400);
    const cu = customers.get(customer_id); if (!cu) return c.json({ error: '客户不存在' }, 404);
    // 优先复用现有 generateFollowupMessage，强制目标语言
    const m = await generateFollowupMessage(customer_id, { type, language: language === 'zh' ? 'zh' : 'en' });
    if (language === 'en' || language === 'zh') return c.json({ ...m, language, type });
    // 其它语言：基于中/英文内容做二次语言替换
    const { transcript } = gatherCustomerContext(customer_id, 5000);
    const r = await chatJSON({
      model: DEFAULTS.chat, temperature: 0.3,
      system: `你是外贸客户跟进专家。请用${langName}撰写一封可直接发送的${type === 'email' ? '商务邮件' : 'WhatsApp 消息'}。强制全部正文与主题使用${langName}，不得出现中文。输出 JSON {subject, body, tone, key_points, cta}。`,
      user: `客户：${cu.name}${cu.company ? '（' + cu.company + '）' : ''}\n画像：${JSON.stringify(cu.profile || {}).slice(0, 1500)}\n最近聊天：\n${transcript.slice(0, 4000)}`,
    });
    return c.json({ ...(r || {}), language, type, customer: cu.name, customer_id } );
  });
}
