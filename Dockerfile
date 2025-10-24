# ==============================
# === BASE IMAGE
# ==============================
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Ничего не качаем: просто включаем corepack-шимы
RUN corepack enable

# Сначала кладем vendored Yarn и конфиг, чтобы Yarn 4 взялся локально
COPY .yarn ./.yarn
COPY .yarnrc.yml ./

# Быстрый sanity-check: точно Yarn 4 из репо
RUN node ./.yarn/releases/yarn-4.10.3.cjs -v

# ==============================
# === BUILD STAGE
# ==============================
FROM base AS build

# Prisma требует OpenSSL и в build-стадии тоже
RUN apk add --no-cache openssl

# Манифесты для установки зависимостей
COPY package.json yarn.lock ./

# Кэш Yarn внутри контейнера (ускоряет повторы)
ENV YARN_CACHE_FOLDER=/yarn_cache
RUN mkdir -p $YARN_CACHE_FOLDER

# Установка зависимостей без сборки (Yarn 4, без сети для самого Yarn)
RUN yarn install --immutable --mode=skip-build

# Исходники и Prisma
COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Генерация Prisma Client и билд
RUN yarn prisma generate && yarn build

# ==============================
# === RUNTIME (prod)
# ==============================
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Для Prisma runtime
RUN apk add --no-cache openssl

# Vendored Yarn и конфиг (чтобы любой yarn-командой управлял Yarn 4)
COPY .yarn ./.yarn
COPY .yarnrc.yml ./

# Манифесты и прод-зависимости
COPY package.json yarn.lock ./
ENV YARN_CACHE_FOLDER=/yarn_cache
RUN mkdir -p $YARN_CACHE_FOLDER
RUN yarn install --immutable --mode=skip-build

# Сборка и Prisma схемы
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# (если нужно) переменные окружения
COPY .env .env

# uploads + права
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 8080

# Генерация клиента (на случай обновления окружения) + миграции + старт
CMD ["sh", "-c", "yarn prisma generate && yarn prisma migrate deploy && node dist/src/main.js"]
