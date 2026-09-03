// 多语言（外贸场景）：简体中文 / 英文 完整，其余语言回落英文
import { useStore } from './store/index.js';

export const LOCALES = [
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'en-US', label: 'English', flag: '🇬🇧' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
];
export const FULL_LOCALES = new Set(['zh-CN', 'en-US']);

const en = {
  app_name: 'Customer Analyst', app_sub: 'AI Customer Analysis',
  // sidebar
  new_chat: 'New chat', search_chat: 'Search chats', nav_overview: 'Overview', nav_customers: 'Customers', nav_inventory: 'Products & Pricing', nav_staff: 'Team', nav_followups: 'Follow-ups', nav_knowledge: 'Knowledge', nav_settings: 'Settings',
  nav_activity: 'Activity', group_today: 'Today', group_7d: 'Last 7 days', group_30d: 'Last 30 days', group_older: 'Older', no_chat: 'No chats yet',
  sidebar_footer: 'AI Ping · DeepSeek V4', collapse: 'Collapse sidebar', expand: 'Expand sidebar', toggle_theme: 'Toggle theme',
  // top bar
  chat_models: 'Chat / Reasoning · AI Ping', default_model: 'Default model', only_conv: 'Only affects this conversation', more_models_help: 'More models in Settings', vision: 'Vision', reasoning: 'Reasoning',
  info_panel: 'Information', refresh: 'Refresh',
  // chat
  empty_title: 'Which customer shall we analyze today?', empty_sub: 'Import chats or screenshots → profile & loyalty → multi-dim table & scripts → dynamic pricing & team/inventory',
  placeholder: 'Ask, or paste chat records / screenshots…', send: 'Send', stop: 'Stop', enter_hint: 'Enter to send · Shift+Enter newline · paste screenshots',
  thinking: 'Thinking…', thought: 'Reasoned', copy: 'Copy', regen: 'Regenerate', edit_resend: 'Edit & resend', cancel: 'Cancel',
  // quick
  qi_import: 'Import & analyze', qi_churn: 'Churn check', qi_table: 'Table & scripts', qi_kb: 'Knowledge Q&A', qi_web: 'Web research', qi_pricing: 'Dynamic pricing',
  // panels
  p_home: 'Overview', p_customers: 'Customer list', p_customer: 'Customer', p_table: 'Analysis table', p_pricing: 'Dynamic pricing', p_inventory: 'Products / Pricing', p_staff: 'Team', p_knowledge: 'Knowledge', p_web: 'Web search', p_image: 'Image', p_settings: 'Model settings', p_activity: 'Activity', p_members: 'Members',
  // home panel
  h_biz: 'Business overview', h_customers: 'Customers', h_profiled: 'Profiled', h_loyalty_avg: 'Avg loyalty', h_churn: 'High churn risk', h_sku: 'Products', h_lowstock: 'Low stock', h_invvalue: 'Inventory value', h_staff: 'Team', h_kbdocs: 'Knowledge docs', h_recent: 'Recent customers', h_not_analyzed: 'Not analyzed',
  h_export_all: 'Export all', h_guide: 'Usage guide', h_g1: '① Paste chat records or upload screenshots in the chat — auto file & analyze.', h_g2: '② Say "analyze profile / loyalty" — results appear here.', h_g3: '③ Say "generate table & scripts", exportable to CSV.', h_g4: '④ Add products, then say "dynamic pricing for a customer".', h_g5: '⑤ Upload docs in Knowledge; chatbots auto-search or browse the web.',
  // customer panel
  gen_profile: 'Generate profile', refresh_profile: 'Refresh profile', gen_loyalty: 'Analyze loyalty', refresh_loyalty: 'Refresh loyalty', table_scripts: 'Table + scripts', ask_agent: 'Ask agent', no_records: 'No chats yet — import in Records or paste in chat.', export_report: 'Export report',
  tab_profile: 'Profile', tab_loyalty: 'Loyalty', tab_records: 'Records', tab_tables: 'Tables', tab_edit: 'Edit', tab_comments: 'Notes',
  save: 'Save', delete: 'Delete', edit: 'Edit', add: 'Add', import_text: 'Import text', upload_img: 'Screenshot', upload_file: 'File', newly_created: 'New customer', search_customer: 'Search customer',
  comment_placeholder: 'Add a collaboration note…', comment_send: 'Note', comment_empty: 'No notes', people: 'people',
  // analysis sub-renderers
  a_basic: 'Basic', a_personality: 'Personality & style', a_needs: 'Needs & pain points', a_explicit: 'Explicit needs', a_implicit: 'Implicit needs', a_pain: 'Pain points', a_decision: 'Decision chain', a_stage: 'Stage', a_urgency: 'Urgency', a_drivers: 'Drivers', a_concerns: 'Concerns', a_pricesens: 'Price sensitivity', a_behavior: 'Behavior', a_resp: 'Response speed', a_hours: 'Active hours', a_channel: 'Channel', a_engage: 'Engagement', a_risks: 'Risks', a_opps: 'Opportunities', a_evidence: 'Evidence (quotes)', a_score: 'Score', a_level: 'Level', a_lifecycle: 'Lifecycle', a_trend: 'Trend', a_dimensions: 'Six-dimension scores', a_churn: 'Churn risk', a_prob: 'Probability', a_signals: 'Signals', a_retention: 'Retention actions', a_next: 'Next contact', a_timing: 'Timing', a_topic: 'Topic', a_via: 'Channel', a_unknown: 'Not analyzed yet', a_not_generated: 'Not generated yet',
  // table
  t_csv: 'CSV', t_rows: 'rows', t_guide: 'Suggested talk', t_tone: 'Tone', t_do: 'Do', t_dont: 'Avoid', t_openers: 'Openers', t_objections: 'Objection handling', t_qa: 'Q', t_ascene: 'A', t_closing: 'Closing', t_scripts: 'Scenarios', t_none: 'No tables', t_load: 'Loading…',
  // pricing
  p_calc: 'Pricing calculator', p_product: 'Product', p_customer: 'Customer (optional)', p_general: 'General', p_demand: 'Demand (0-2)', p_competitor: 'Competitor price', p_season: 'Season factor', p_calc_btn: 'Calculate', p_apply: 'Apply & save', p_calc_hint: 'Calculate', p_current: 'Current', p_base: 'Base', p_cost: 'Cost', p_suggested: 'Suggested', p_margin: 'Margin', p_dist: 'Price distribution', p_floor: 'Floor', p_suggest: 'Suggested', p_list: 'List', p_ceiling: 'Ceiling', p_factors: 'Factor contributions', p_tiers: 'Customer tiers', p_applied: 'Applied', p_agent: 'Agent insights', p_rationale: 'Rationale', p_risks: 'Risks', p_tactics: 'Tactics',
  // inventory
  inv_low_alert: 'Low stock', inv_new: 'Add product', inv_edit: 'Edit product', inv_name: 'Name', inv_sku: 'SKU', inv_cat: 'Category', inv_unit: 'Unit', inv_cost: 'Cost', inv_base: 'Base price', inv_stock: 'Stock', inv_min: 'Min stock', inv_add: 'Add', inv_cancel: 'Cancel', inv_report: 'Stock report', inv_list: 'Products', inv_search: 'Search', inv_price: 'Dynamic pricing', inv_in: 'Stock-in', inv_out: 'Stock-out', inv_hist: 'History', inv_none: 'No products', inv_prices: 'Price changes', inv_flows: 'Stock movements', inv_none_hist: 'None',
  // staff
  st_add: 'Add member', st_edit: 'Edit member', st_name: 'Name', st_role: 'Role', st_dept: 'Department', st_phone: 'Phone', st_status: 'Status', st_active: 'Active', st_leave: 'Leave', st_inactive: 'Inactive', st_skills: 'Skills (comma)', st_save: 'Save', st_add_btn: 'Add', st_cancel: 'Cancel', st_assign: 'Assign customer', st_choose_member: 'Choose member', st_choose_customer: 'Choose customer', st_assign_btn: 'Assign', st_recommend: 'Ask agent', st_list: 'Team', st_customers: 'customers', st_none: 'No members',
  // knowledge
  kb_search: 'Search', kb_ph: 'Semantic + full-text search', kb_no: 'No results', kb_add: 'Add material', kb_title: 'Title', kb_body: 'Paste product docs, scripts, FAQ, cases…', kb_ingest: 'Add to KB', kb_upload: 'Upload file', kb_docs: 'Documents', kb_none: 'KB empty', kb_del: 'Delete document',
  // web
  web_search: 'Search', web_ph: 'Web search', web_engine: 'Engine', web_no: 'No results',
  // settings
  s_provider: 'Model provider', s_key_ok: 'API key configured', s_key_no: 'No API key', s_key_hint: 'Set AIPING_API_KEY in .env', s_chat: 'Chat / Reasoning', s_vision: 'Vision (OCR)', s_image: 'Image generation', s_embed: 'Embedding', s_thinking: 'Thinking mode', s_auto: 'Auto', s_on: 'Always on', s_off: 'Off (faster)', s_save: 'Save', s_pull: 'Fetch platform models', s_saved: 'Saved', s_custom_ph: 'Or type any AI Ping model ID', s_custom: 'Custom', s_models: 'Platform models',
  // login
  login_title: 'Sign in to Customer Analyst', login_user: 'Username', login_pass: 'Password', login_btn: 'Sign in', login_register: 'Create account', login_name: 'Display name', register_btn: 'Sign up', login_hint: 'Default: admin / admin123',
  // user menu
  u_settings: 'Account', u_language: 'Language', u_logout: 'Log out', u_theme: 'Theme', u_members: 'Members', u_admin: 'Admin', u_member: 'Member', u_online: 'online', u_offline: 'offline', u_role_admin: 'Administrator', u_role_member: 'Member',
  // activity
  act_empty: 'No activity yet', act_title: 'Team activity', act_online: 'online now', act_members: 'Members',
  a_act_create: 'created', a_act_update: 'updated', a_act_import: 'imported chats', a_act_analyze: 'analyzed', a_act_pricing: 'set pricing', a_act_assign: 'assigned', a_act_add: 'added', a_act_comment: 'commented', a_act_chat: 'chat with agent', a_act_delete: 'deleted', a_act_invite: 'invited', a_ent_customer: 'customer', a_ent_product: 'product', a_ent_staff: 'member', a_ent_kb: 'knowledge', a_ent_conversation: 'conversation',
  fu_title: 'Follow-ups', fu_today: 'Today', fu_overdue: 'Overdue', fu_upcoming: 'Upcoming', fu_all: 'All', fu_done: 'Done',
  fu_type_call: 'Call', fu_type_email: 'Email', fu_type_whatsapp: 'WhatsApp', fu_type_meeting: 'Meeting', fu_type_other: 'Other',
  fu_add: 'New follow-up', fu_choose_customer: 'Customer', fu_due: 'Due', fu_note: 'Note', fu_subject: 'Subject', fu_create: 'Create', fu_complete: 'Done', fu_empty: 'No follow-ups', fu_customer: 'Customer',
  fu_generate: 'Generate follow-up', fu_email: 'Email', fu_whatsapp: 'WhatsApp', fu_lang: 'Language', fu_en: 'English', fu_zh: '中文', fu_gen: 'Generate', fu_copy_msg: 'Copy', fu_subject_l: 'Subject', fu_body_l: 'Body', fu_tone: 'Tone', fu_keypoints: 'Key points', fu_cta: 'Call to action', fu_regenerate: 'Regenerate', fu_gen_btn: 'Generate email/WhatsApp',
  rfm_title: 'RFM', rfm_r: 'Recency R', rfm_f: 'Frequency F', rfm_m: 'Monetary M', rfm_segment: 'Segment', rfm_desc: 'Strategy', rfm_analyze: 'RFM', rfm_overview: 'Segments', rfm_loyalty_dims: 'Loyalty radar', rfm_price_dist: 'Price distribution',
  p_preview: 'Metrics',
  err_render: 'This area failed to render', retry: 'Retry', err: 'Error', loading: 'Loading…',
};

const zh = {
  app_name: '客户分析智能体', app_sub: 'AI 客户分析',
  new_chat: '新建对话', search_chat: '搜索对话', nav_overview: '概览', nav_customers: '客户', nav_inventory: '货物定价', nav_staff: '人员', nav_followups: '跟进', nav_knowledge: '知识库', nav_settings: '设置', nav_activity: '动态',
  group_today: '今天', group_7d: '最近 7 天', group_30d: '最近 30 天', group_older: '更早', no_chat: '暂无对话',
  sidebar_footer: 'AI Ping · DeepSeek V4', collapse: '收起侧栏', expand: '展开侧栏', toggle_theme: '切换主题',
  chat_models: '对话 / 推理模型 · AI Ping', default_model: '默认模型', only_conv: '仅对当前对话生效', more_models_help: '更多模型在「设置」中配置', vision: '视觉', reasoning: '推理',
  info_panel: '信息面板', refresh: '刷新',
  empty_title: '今天想分析哪位客户？', empty_sub: '导入聊天记录或截图 → 深层画像与忠诚度 → 多维表格与话术 → 动态定价与人员货物管理',
  placeholder: '输入问题，或粘贴聊天记录 / 截图…', send: '发送', stop: '停止', enter_hint: 'Enter 发送 · Shift+Enter 换行 · 支持粘贴截图',
  thinking: '思考中…', thought: '已思考', copy: '复制', regen: '重新生成', edit_resend: '编辑并重发', cancel: '取消',
  qi_import: '导入并分析', qi_churn: '流失风险排查', qi_table: '表格与话术', qi_kb: '知识库问答', qi_web: '联网调研', qi_pricing: '动态定价',
  p_home: '概览', p_customers: '客户列表', p_customer: '客户档案', p_table: '多维表格', p_pricing: '动态定价', p_inventory: '货物/定价', p_staff: '人员管理', p_knowledge: '知识库', p_web: '网络搜索', p_image: '生成图片', p_settings: '模型设置', p_activity: '协作动态', p_members: '成员',
  h_biz: '业务概览', h_customers: '客户总数', h_profiled: '已画像', h_loyalty_avg: '平均忠诚度', h_churn: '高流失风险', h_sku: '商品 SKU', h_lowstock: '低库存', h_invvalue: '库存价值', h_staff: '员工', h_kbdocs: '知识库文档', h_recent: '最近客户', h_not_analyzed: '未分析',
  h_export_all: '导出全部', h_guide: '使用指引', h_g1: '① 在中栏粘贴聊天记录、上传截图或文件，智能体自动建档。', h_g2: '② 说"分析画像 / 忠诚度"，结果出现在本面板。', h_g3: '③ 说"生成多维表格和话术"，可导出 CSV。', h_g4: '④ 在「货物/定价」录入商品，说"给某客户做动态定价"。', h_g5: '⑤ 在「知识库」上传资料，对话中自动检索或联网搜索。',
  gen_profile: '生成画像', refresh_profile: '刷新画像', gen_loyalty: '忠诚度分析', refresh_loyalty: '刷新忠诚度', table_scripts: '多维表格+话术', ask_agent: '问智能体', no_records: '尚无聊天记录，请先在下方「记录」导入或在对话中粘贴。', export_report: '导出报告',
  tab_profile: '画像', tab_loyalty: '忠诚度', tab_records: '记录', tab_tables: '表格', tab_edit: '编辑', tab_comments: '协作笔记',
  save: '保存', delete: '删除', edit: '编辑', add: '添加', import_text: '导入文本', upload_img: '截图', upload_file: '文件', newly_created: '新客户', search_customer: '搜索客户',
  comment_placeholder: '添加一条协作笔记…', comment_send: '记录', comment_empty: '暂无笔记', people: '人',
  a_basic: '基本信息', a_personality: '性格与沟通风格', a_needs: '需求与痛点', a_explicit: '明确需求', a_implicit: '隐性需求', a_pain: '痛点', a_decision: '决策链', a_stage: '阶段', a_urgency: '紧迫度', a_drivers: '驱动因素', a_concerns: '顾虑', a_pricesens: '价格敏感度', a_behavior: '行为特征', a_resp: '响应速度', a_hours: '活跃时段', a_channel: '偏好渠道', a_engage: '互动积极度', a_risks: '风险', a_opps: '机会', a_evidence: '关键依据（原文）', a_score: '忠诚度得分', a_level: '等级', a_lifecycle: '生命周期', a_trend: '趋势', a_dimensions: '六维评分', a_churn: '流失风险', a_prob: '概率', a_signals: '信号', a_retention: '维系动作', a_next: '下次联系', a_timing: '时机', a_topic: '话题', a_via: '渠道', a_unknown: '尚未进行忠诚度分析', a_not_generated: '尚未生成画像',
  t_csv: 'CSV', t_rows: '行', t_guide: '建议对话方式', t_tone: '整体语气', t_do: '应该', t_dont: '避免', t_openers: '开场白', t_objections: '异议处理', t_qa: '问', t_ascene: '答', t_closing: '促成话术', t_scripts: '场景脚本', t_none: '暂无表格', t_load: '加载中…',
  p_calc: '定价计算器', p_product: '商品', p_customer: '目标客户（可选）', p_general: '通用', p_demand: '需求热度 (0-2)', p_competitor: '竞品价格', p_season: '季节/活动系数', p_calc_btn: '计算', p_apply: '计算并应用', p_calc_hint: '计算', p_current: '现价', p_base: '基准', p_cost: '成本', p_suggested: '建议价', p_margin: '毛利', p_dist: '价格分布', p_floor: '底价', p_suggest: '建议', p_list: '挂牌', p_ceiling: '上限', p_factors: '因子贡献', p_tiers: '客户分层价', p_applied: '已应用', p_agent: '智能体解读', p_rationale: '定价理由', p_risks: '风险', p_tactics: '谈判技巧',
  inv_low_alert: '低库存预警', inv_new: '新增商品', inv_edit: '编辑商品', inv_name: '名称', inv_sku: 'SKU', inv_cat: '分类', inv_unit: '单位', inv_cost: '成本', inv_base: '基准价', inv_stock: '库存', inv_min: '安全库存', inv_add: '新增', inv_cancel: '取消', inv_report: '库存报告', inv_list: '商品列表', inv_search: '搜索', inv_price: '定价', inv_in: '入库', inv_out: '出库', inv_hist: '历史', inv_none: '暂无商品，请先录入', inv_prices: '价格变动', inv_flows: '库存流水', inv_none_hist: '无',
  st_add: '新增员工', st_edit: '编辑员工', st_name: '姓名', st_role: '岗位', st_dept: '部门', st_phone: '电话', st_status: '状态', st_active: '在岗', st_leave: '休假', st_inactive: '离职', st_skills: '技能标签（逗号分隔）', st_save: '保存', st_add_btn: '新增', st_cancel: '取消', st_assign: '分配客户', st_choose_member: '选择员工', st_choose_customer: '选择客户', st_assign_btn: '分配', st_recommend: '让智能体推荐', st_list: '员工', st_customers: '客户', st_none: '暂无员工',
  kb_search: '检索', kb_ph: '语义 + 全文混合检索', kb_no: '无相关内容', kb_add: '添加资料', kb_title: '标题', kb_body: '粘贴产品资料、话术、FAQ、案例…', kb_ingest: '入库', kb_upload: '上传文件', kb_docs: '文档', kb_none: '知识库为空', kb_del: '删除文档',
  web_search: '联网搜索', web_ph: '联网搜索', web_engine: '引擎', web_no: '无结果',
  s_provider: '模型平台', s_key_ok: '已配置 API Key', s_key_no: '未配置', s_key_hint: '在项目根目录 .env 中修改 AIPING_API_KEY', s_chat: '对话 / 推理模型', s_vision: '多模态（截图识别）', s_image: '图片生成', s_embed: 'Embedding', s_thinking: '思考模式', s_auto: '自动（推理模型开启）', s_on: '始终开启', s_off: '关闭（更快）', s_save: '保存', s_pull: '拉取平台模型列表', s_saved: '已保存', s_custom_ph: '或直接输入 AI Ping 模型 ID', s_custom: '自定义', s_models: '平台模型',
  login_title: '登录客户分析智能体', login_user: '用户名', login_pass: '密码', login_btn: '登录', login_register: '注册账号', login_name: '显示名', register_btn: '注册', login_hint: '默认账号：admin / admin123',
  u_settings: '账号', u_language: '语言', u_logout: '退出登录', u_theme: '主题', u_members: '成员', u_admin: '管理员', u_member: '成员', u_online: '在线', u_offline: '离线', u_role_admin: '管理员', u_role_member: '成员',
  act_empty: '暂无协作动态', act_title: '团队协作动态', act_online: '当前在线', act_members: '成员',
  a_act_create: '创建了', a_act_update: '更新了', a_act_import: '导入了聊天记录', a_act_analyze: '分析了', a_act_pricing: '设置定价', a_act_assign: '分配了客户', a_act_add: '添加了', a_act_comment: '添加了评论', a_act_chat: '与智能体对话', a_act_delete: '删除了', a_act_invite: '邀请成员', a_ent_customer: '客户', a_ent_product: '商品', a_ent_staff: '员工', a_ent_kb: '知识库', a_ent_conversation: '对话',
  fu_title: '跟进任务', fu_today: '今日', fu_overdue: '逾期', fu_upcoming: '未来', fu_all: '全部', fu_done: '已完成',
  fu_type_call: '电话', fu_type_email: '邮件', fu_type_whatsapp: 'WhatsApp', fu_type_meeting: '面谈', fu_type_other: '其他',
  fu_add: '新建跟进', fu_choose_customer: '客户', fu_due: '截止', fu_note: '备注', fu_subject: '主题', fu_create: '创建', fu_complete: '完成', fu_empty: '暂无跟进任务', fu_customer: '客户',
  fu_generate: '生成跟进消息', fu_email: '邮件', fu_whatsapp: 'WhatsApp', fu_lang: '语言', fu_en: '英文', fu_zh: '中文', fu_gen: '生成', fu_copy_msg: '复制', fu_subject_l: '主题', fu_body_l: '正文', fu_tone: '语气', fu_keypoints: '要点', fu_cta: '行动号召', fu_regenerate: '重新生成', fu_gen_btn: '生成邮件/WhatsApp',
  rfm_title: 'RFM 分层', rfm_r: '近度 R', rfm_f: '频次 F', rfm_m: '金额 M', rfm_segment: '分层', rfm_desc: '策略', rfm_analyze: 'RFM 分析', rfm_overview: '客户分层', rfm_loyalty_dims: '忠诚度雷达', rfm_price_dist: '价格分布',
  p_preview: '指标预览',
  err_render: '此区域渲染出错', retry: '重试', err: '错误', loading: '加载中…',
};

const dict = { 'zh-CN': zh, 'en-US': en };

export function translate(locale, key, vars) {
  let s = dict[locale]?.[key];
  if (s == null) s = dict['en-US'][key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = String(s).replace(`{${k}}`, vars[k]);
  return s;
}
export function localeFlag(code) { return LOCALES.find(l => l.code === code)?.flag || '🌐'; }

/** 在组件内使用：const { t, locale, setLocale } = useI18n(); */
export function useI18n() {
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);
  const t = (key, vars) => translate(locale, key, vars);
  return { t, locale, setLocale, isFull: FULL_LOCALES.has(locale) };
}
