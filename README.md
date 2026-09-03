# 客户分析智能体（Customer Analyst）

面向公司销售 / 客户运营团队的商业客户分析软件。三分栏布局（左：对话记录，中：与智能体对话，右：信息面板），Agent 驱动，模型全部走 **AI Ping 平台**（OpenAI 兼容接口）。

## 功能

| # | 能力 | 实现 |
|---|------|------|
| 1 | 导入聊天记录 / 聊天截图 | 文本解析（微信/QQ/钉钉导出、`说话人: 内容`）；截图由多模态模型（Qwen3-VL）转写为结构化对话 |
| 2 | 知识库检索 | Qwen3-Embedding 向量 + SQLite FTS5 全文，RRF 混合排序 |
| 3 | 网络搜索 | Bing 中文站抓取（零配置）；设置 `TAVILY_API_KEY` 自动切换 Tavily |
| 4 | 深层画像 + 忠诚度分析 | DISC 性格、需求/痛点、决策链、价格敏感度、六维忠诚度评分、流失风险、维系动作 |
| 5 | 多维表格 + 建议对话方式 | 11 维分析表（可导出 CSV）+ 语气 / Do & Don't / 开场白 / 异议处理 / 促成话术 / 场景脚本 |
| 6 | 动态定价 + 人员货物管理 | 规则引擎（库存压力、需求热度、忠诚度、价格敏感度、竞品价、季节、紧迫度）→ 建议价 / 价格分布 / 客户分层价；商品库存出入库、员工与客户分配、智能推荐跟进人 |

## 架构

```
analyst/
├── server/                 Node 24 + Hono，零原生依赖（node:sqlite）
│   └── src/
│       ├── db/index.js     SQLite 数据层（会话/消息/客户/记录/知识库/表格/商品/人员）
│       ├── llm/aiping.js   AI Ping 客户端：chat / stream / vision / image / embedding + 模型注册表
│       ├── agent/tools.js  24 个 Agent 工具定义与执行器
│       ├── agent/runtime.js 多轮工具调用循环 + SSE 事件流
│       ├── tools/          importer / knowledge / web / analysis / pricing
│       └── routes/api.js   REST + SSE 接口
├── web/                    React 19 + Vite + Tailwind 4 + Zustand
│   └── src/
│       ├── components/     Sidebar（左栏）、Chat（中栏）
│       └── panels/         右栏：概览 / 客户 / 表格 / 定价 / 货物 / 人员 / 知识库 / 搜索 / 图片 / 设置
├── data/analyst.db         本地数据库（自动创建）
└── .env                    AIPING_API_KEY 等
```

**Agent 设计**：智能体通过 OpenAI function calling 调用工具，每轮最多 8 次工具循环；工具执行结果携带 `panel` 指令，前端右侧栏据此自动切换到对应视图（客户画像 / 表格 / 定价 / 库存 / 人员 / 知识库 / 搜索结果）。

## 模型（AI Ping，均已验证）

- 对话/推理：**DeepSeek-V4-Flash-Vision-Exp（默认）**、DeepSeek-V4-Flash、DeepSeek-V4-Pro、DeepSeek-V3.2、Kimi-K2.5、GLM-4.7 …
- 多模态（截图识别，亦为主对话模型）：**DeepSeek-V4-Flash-Vision-Exp**、Qwen3-VL-30B、GLM-4.6V
- 图片生成：Qwen-Image、Doubao-Seedream-4.5、Kolors
- Embedding：Qwen3-Embedding-0.6B（1024 维）

可在顶部模型选择器或右栏「设置」中切换，也可手输平台任意模型 ID。默认模型现为 **DeepSeek-V4-Flash-Vision-Exp**（支持视觉、推理与工具调用）。

## 运行

```bash
cp .env.example .env    # 填入 AIPING_API_KEY
pnpm install
pnpm build              # 构建前端
pnpm start              # http://127.0.0.1:3090
```

开发模式（前端热更新）：`pnpm dev`，前端 http://127.0.0.1:5190 代理到后端 3090。

## 20 项功能升级（features/

每个功能 = `server/src/features/<id>.js`（REST 模块）+ `web/src/panels/features/<id>.jsx`（面板），由 `server/src/features/index.js` 与 `web/src/panels/features/index.jsx` 统一注册挂载，左栏「更多功能」可展开。

- **数据**：成交订单（真实 RFM 金额）、流失预测、情感分析、异常检测
- **内容**：竞品对标、话术库、客户问卷（NPS）、多语种生成（西/法/德/俄/阿/葡/日…）
- **流程**：触达时间线、到期提醒、审批流（调价/优惠）、权限与数据隔离（team/private）、审计合规导出
- **智能**：每日简报、会话标签与摘要、多智能体分工、批量建档（CSV/批量聊天）
- **平台**：开放 API/Webhook、移动端/PWA、数据大屏

## 第二批 16 项功能升级

- **自动化与 CRM**：触发式自动化（IFTTT 规则引擎）、销售管道看板（可拖拽）、智能跟进排程
- **智能化**：对话式 BI（自然语言查数据）、客户分群/聚类、LTV 预测、语音记录（ASR 可选）
- **协作与集成**：IM 通知机器人（钉钉/企微/Telegram）、邮件/WhatsApp 定时发送+回执、消息直连 ingress
- **数据与合规**：多币种+汇率、报表中心+定时周报/月报、全库备份/恢复、字段级/操作级权限（成员隐藏成本等）
- **体验**：Word/PDF/HTML 报告导出、全屏数据大屏

## 进阶升级

- **RFM 客户分层**：近度/频次/金额 → 8 类分层（重要价值/发展/保持/挽留等），自动打标签，仪表盘分层环图 + 客户雷达图。
- **图表可视化**：忠诚度六维雷达图、价格分布柱状图、RFM 环图、忠诚度条形图（recharts）。
- **跟进任务管理**：创建电话/邮件/WhatsApp/面谈跟进，今日/逾期/未来/全部/已完成视图；忠诚度的"下次联系建议"可一键转为任务。
- **一键生成跟进邮件/WhatsApp**：基于画像+忠诚度+聊天记录生成可直接发送的中/英文邮件或 WhatsApp 消息。
- **Excel (.xlsx) 导出**：客户报告/全部客户，单客户多 Sheet（信息+画像+各多维表格）。

## 多人协作 / 多语言 / 报表导出

- **账号与协作**：注册/登录（scrypt 加密 + token 会话），admin / admin123 默认管理员；成员可邀请、分配客户（owner）、在线状态；团队协作动态流（「动态」面板）、客户协作笔记（评论）。
- **多语言**：zh-CN / en-US 完整，另支持西/法/德/日（回落英文）；顶部「语言」切换器或账号设置切换；智能体会按用户语言回复；报表 CSV 导出可随语言切换表头。
- **报表 CSV 导出**：客户详情「导出报告」（档案+画像+忠诚度+多维表格）；概览「Export all」导出全部客户汇总；多维表格可单独导出 CSV。

## UI 能力（参考 DeepSeek Harness / Open WebUI）

- 明/暗主题切换（⌘⇧L），随系统偏好，可手动切换
- 可收起左/右侧栏（⌘B / ⌘.），中央对话区自适应
- 顶部模型选择器：当前对话按需切换模型，带「视觉/推理」标记
- 消息操作：复制 / 编辑并重发 / 重新生成
- 聊天截图直接粘贴或上传，多模态模型自动识别转写

## 使用流程

1. 中栏粘贴聊天记录 / 上传截图（可直接 Ctrl+V 粘贴图片）→ 智能体自动建档、导入
2. 说「做画像和忠诚度分析」→ 右栏展示结果
3. 说「生成多维表格和话术」→ 右栏表格，可导出 CSV
4. 右栏「货物/定价」录入商品，说「结合某客户忠诚度对某商品做动态定价，竞品价 xxx」
5. 右栏「人员」录入员工，说「推荐跟进人并分配」
6. 右栏「知识库」上传资料；对话中自动检索或让智能体联网搜索
