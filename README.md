# 客户分析智能体 · Customer Analyst

> 把客户聊天变成**成交洞察**的 AI 客户运营平台 —— 基于 **AI Ping / DeepSeek** 多模型，面向外贸与销售团队。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-24+-blue.svg)](https://nodejs.org)
[![UI](https://img.shields.io/badge/UI-3-column%20Agent%20App-blueviolet.svg)](#)
[![GitHub stars](https://img.shields.io/github/stars/liyixuan201211/customer-analyst.svg?style=social)](https://github.com/liyixuan201211/customer-analyst)

## 这是什么

一套**三分栏**的 AI 客户分析 Agent 应用（参考 Open WebUI / DeepSeek Harness 的交互），让销售/客户运营团队：

1. **导入聊天记录或截图** → 自动识别客户并建档（微信/QQ/钉钉/任意文本，或粘贴/上传截图，多模态模型逐条转写）
2. **知识库检索 + 联网搜索** → 基于公司资料与最新行业动态
3. **深层客户画像 + 忠诚度分析**（DISC 性格、需求痛点、决策链、六维忠诚度、流失风险）
4. **多维分析表格 + 建议对话方式**（开场白 / 异议处理 / 促成语术）
5. **动态定价** + 库存/货物管理 + 人员管理与分配
6. **RFM 分层 / 流失预测 / 情感分析 / 异常检测 / LTV / 客户分群**（进阶分析）
7. **跟进任务 / 触发式自动化 / 管道看板 / 每日简报**（CRM 闭环）
8. **多渠道**：中英文界面、跟进邮件/WhatsApp 生成（西/法/德/俄/阿/葡/日）、报表 CSV/XLSX/Word 导出、PWA、IM 通知

> 36+ 功能，全部挂在一个可扩展的 `features/` 注册器上：每个功能 = 一个后端 REST 模块 + 一个前端面板，新功能即插即用。

## 界面截图

| 概览 / 仪表盘 | 数据大屏 |
|---|---|
| ![概览](docs/screenshots/overview.png) | ![数据大屏](docs/screenshots/dashboard.png) |

| 销售管道看板 | 客户画像 |
|---|---|
| ![管道看板](docs/screenshots/pipeline.png) | ![客户画像](docs/screenshots/customer.png) |

## 架构

```
analyst/
├── server/                     Node 24 + Hono，零原生依赖（node:sqlite）
│   └── src/
│       ├── db/index.js         数据层（会话/客户/记录/知识库/表格/商品/人员/订单/审批/自动化…）
│       ├── llm/aiping.js       AI Ping 客户端：chat/stream/vision/image/embedding + 模型注册表
│       ├── agent/              多轮工具调用循环 + SSE 流式 + 24 个 Agent 工具
│       ├── features/           36 个功能模块（REST 子路由），注册器统一挂载
│       ├── tools/              importer / knowledge / web / analysis / pricing / report
│       └── routes/api.js       REST + SSE + 认证中间件 + 用户/协作
├── web/                        React 19 + Vite + Tailwind 4 + Zustand + recharts
│   └── src/
│       ├── components/         左栏 Sidebar / 中栏 Chat / 图表面板
│       └── panels/             右栏信息面板 + features/（36 个功能面板）
├── data/                       SQLite 数据库（运行时生成，不入库）
├── .env.example                AI Ping 配置模板
└── start.sh                    一键构建+启动
```

- **模型**：AI Ping（DeepSeek-V4-Flash-Vision-Exp 默认：对话 + 多模态 + 工具调用；可选 Qwen/GLM/Kimi 等 146+ 模型）
- **多用户**：注册/登录（scrypt + token），管理员/成员，团队协作动态流、协作笔记、审批流、字段级权限
- **i18n**：简体中文 / English（西/法/德/俄/阿/葡/日 回落英文）

## 运行（开箱即用）

```bash
cp .env.example .env          # 填入你的 AI Ping API Key（https://aiping.cn）
pnpm install
pnpm build                    # 构建前端
pnpm start                    # http://127.0.0.1:3090
```

或使用 Docker（一条命令）：
```bash
docker compose up --build
```

默认账号：`admin / admin123`（首次登录后请在「账号设置」改密）。可选：`node server/seed.js` 生成一批演示数据。

开发模式（前端热更新）：
```bash
pnpm dev                     # 前端 :5190 代理到后端 :3090
```

## 模型切换

默认 **DeepSeek-V4-Flash-Vision-Exp**（对话/截图识别/工具调用）。右栏「模型设置」可切换，或手输 AI Ping 任意模型 ID；顶栏模型选择器可按对话切换。

## 功能一览（36 项）

- **核心**：聊天导入(文本/截图OCR)、知识库(向量+全文)、联网搜索、深层画像、忠诚度、多维表格+话术、动态定价、库存/人员
- **进阶**：成交订单(真实RFM金额)、流失预测、情感分析、异常检测、竞品对标、话术库、客户问卷(NPS)、多语种生成、触达时间线、到期提醒、审批流、权限与数据隔离、审计合规、批量建档、每日简报、会话标签摘要、多智能体分工、Webhook/开放API、移动端PWA、数据大屏
- **第二批**：触发式自动化(IFTTT)、销售管道看板、智能跟进排程、对话式BI、客户分群/聚类、LTV预测、语音记录(ASR可选)、IM通知(钉钉/企微/Telegram)、定时发送+回执、消息直连ingress、多币种汇率、报表中心+定时周报、全库备份/恢复、字段级权限、Word/PDF导出、全屏大屏

## 贡献

欢迎提 Issue / PR。开发环境见上方；新增功能请沿用 `features/` 注册器（`server/src/features/<id>.js` + `web/src/panels/features/<id>.jsx`）。

## License

[MIT](LICENSE)
