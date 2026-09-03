# ---- build stage ----
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml .npmrc* ./
COPY web/package.json web/package.json
COPY server/package.json server/package.json
RUN pnpm install
COPY web web
COPY server server
RUN pnpm --filter @analyst/web build

# ---- run stage ----
FROM node:24-alpine AS run
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY server/package.json server/package.json
RUN pnpm install --prod --filter @analyst/server
COPY server server
COPY --from=build /app/web/dist web/dist
ENV NODE_ENV=production
EXPOSE 3090
CMD ["node", "--env-file=.env", "server/src/index.js"]
