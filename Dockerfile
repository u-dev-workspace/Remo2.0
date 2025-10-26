# ==============================
# === BASE IMAGE
# ==============================
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Устанавливаем Yarn через Corepack (Yarn 4)
RUN corepack enable && corepack prepare yarn@4.10.3 --activate

# ==============================
# === BUILD STAGE
# ==============================
FROM base AS build

# Копируем только нужные файлы для зависимостей
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Устанавливаем зависимости (включая dev)
RUN yarn install --mode=skip-build


# Копируем исходники и Prisma
COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Генерируем Prisma Client и билдим проект
RUN yarn prisma generate && yarn build

# ==============================
# === RUNTIME (продакшн)
# ==============================
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Устанавливаем зависимости для Prisma (OpenSSL)
RUN apk add --no-cache openssl

# Копируем только нужные файлы
COPY package.json yarn.lock ./
COPY .yarn ./.yarn
COPY .yarnrc.yml ./

# Устанавливаем только продакшн-зависимости
RUN yarn install --immutable --mode=skip-build

# Копируем Prisma и сборку
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# (если нужно) копируем .env
COPY .env .env

# Создаём директорию для загрузок
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 8080

# Миграции и запуск приложения
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/src/main.js"]
