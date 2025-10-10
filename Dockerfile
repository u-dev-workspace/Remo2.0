# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Включаем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- deps (установка всех зависимостей) ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm prisma generate
RUN pnpm build

# ---------- production dependencies ----------
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Устанавливаем зависимости для Prisma (native bindings и т.п.)
RUN apk add --no-cache openssl curl

# Копируем необходимые файлы из предыдущих стадий
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# Создаём папку для аплоадов, если используется
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 8080

# Запуск: миграции и старт
CMD ["sh", "-c", "npx prisma migrate deploy && node node dist/src/main.js"]
