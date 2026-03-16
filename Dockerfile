# ==============================
# === DEPS: установка зависимостей (кешируется отдельно)
# ==============================
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare yarn@4.10.3 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable --mode=skip-build

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

RUN yarn prisma generate && yarn build

# ==============================
# === RUNTIME: минимальный production-образ
# ==============================
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080

# Для Prisma нужен OpenSSL
RUN apk add --no-cache openssl

# Копируем только то, что нужно для работы
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

COPY .env .env

EXPOSE 8080

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
