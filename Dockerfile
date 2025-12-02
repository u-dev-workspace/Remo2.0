# ==============================
# === BASE IMAGE
# ==============================
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare yarn@4.10.3 --activate

# ==============================
# === BUILD STAGE
# ==============================
FROM base AS build

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn install --mode=skip-build

COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src



RUN yarn prisma generate && yarn build

# ==============================
# === RUNTIME (production)
# ==============================
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Для Prisma нужен OpenSSL
RUN apk add --no-cache openssl

# ВАЖНО: копируем lockfile и Yarn-артефакты ИЗ build-стадии,
# чтобы runtime видел ТОЧНО такой же lockfile и версию Yarn
COPY --from=build /app/yarn.lock ./yarn.lock
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.yarn ./.yarn
COPY --from=build /app/.yarnrc.yml ./.yarnrc.yml

# Устанавливаем зависимости по перенесённому lockfile
# (теперь --immutable пройдет без YN0028)
RUN corepack enable \
 && corepack prepare yarn@4.10.3 --activate

RUN yarn install --immutable --mode=skip-build

# Копируем Prisma и сборку из build
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# (опционально) окружение — лучше через переменные контейнера/секреты,
# но если нужно — оставляю как было:
COPY .env .env

# Директория для загрузок и права


EXPOSE 8080

# Миграции и запуск приложения
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/src/main.js"]
