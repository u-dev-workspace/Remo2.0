# Этап сборки
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Этап продакшн-образа
FROM node:20-slim AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Копируем собранный билд из builder
COPY --from=builder /app/dist ./dist

# Запускаем
CMD ["node", "dist/main.js"]
