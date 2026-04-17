# ==============================
# === DEPS: установка зависимостей (кешируется отдельно)
# ==============================
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare yarn@4.10.3 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --mode=skip-build

# ==============================
# === TEST: запуск юнит-тестов
# ==============================
FROM deps AS test

COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN yarn prisma generate
RUN yarn test --no-coverage --forceExit

# ==============================
# === BUILD: компиляция
# ==============================
FROM deps AS build

COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN yarn prisma generate && yarn build && test -f dist/src/main.js

# ==============================
# === RUNTIME: минимальный production-образ
# ==============================
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080

# Привязывает GHCR-пакет к GitHub-репозиторию (отображается на странице репо)
LABEL org.opencontainers.image.source="https://github.com/u-dev-workspace/Remo2.0"
LABEL org.opencontainers.image.description="Remo API — backend for contractor platform"

# Для Prisma нужен OpenSSL
RUN apk add --no-cache openssl

# Копируем только то, что нужно для работы
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# .env НЕ копируем в образ — передаётся через Docker Swarm config или env_file при деплое

EXPOSE 8080

# Миграции запускаются ОТДЕЛЬНО в Jenkins (один раз перед деплоем),
# чтобы при Swarm с несколькими репликами не было гонки при накате миграций
CMD ["node", "dist/src/main.js"]
