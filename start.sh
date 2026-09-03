#!/bin/bash
# 一键启动：构建前端并启动服务
cd "$(dirname "$0")"
[ -f .env ] || { echo "请先复制 .env.example 为 .env 并填写 AIPING_API_KEY"; exit 1; }
pnpm --filter @analyst/web build && cd server && exec node --env-file=../.env src/index.js
