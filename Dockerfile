# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
# включаем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- deps (prod+dev для билда) ----------
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# если у тебя есть .npmrc — тоже скопируй
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
WORKDIR /app
COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
# генерим Prisma Client (dev stage, чтобы были типы при билде)
RUN pnpm prisma generate
# билдим Nest
RUN pnpm build

# ---------- prod-deps (только prod-зависимости) ----------
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# полезно для Prisma в alpine
RUN apk add --no-cache openssl curl

# копируем только нужное для рантайма
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# директория для файлов
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 8080
# миграции + старт
CMD sh -c "node -v && npx prisma migrate deploy && node dist/main.js"
