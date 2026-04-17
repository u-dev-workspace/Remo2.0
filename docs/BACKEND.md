# Документация Backend — Remo2.0

**Стек:** NestJS + Fastify | **База:** MySQL + Prisma | **Хранилище:** MinIO | **Дата:** 11 апреля 2026

---

## Содержание

1. [Технологический стек](#1-технологический-стек)
2. [Интеграции](#2-интеграции)
3. [API Маршруты](#3-api-маршруты)
4. [База данных](#4-база-данных)
5. [Seed данные](#5-seed-данные)
6. [Guards и безопасность](#6-guards-и-безопасность)

---

## 1. Технологический стек

### Основные зависимости

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| `@nestjs/core` | 11.1.x | Основной фреймворк |
| `@nestjs/platform-fastify` | 11.1.18 | HTTP адаптер (Fastify вместо Express) |
| `fastify` | 5.8.4 | HTTP сервер |
| `@nestjs/jwt` | 11.0.0 | JWT авторизация |
| `@nestjs/passport` | 11.0.5 | Passport интеграция |
| `passport-jwt` | 4.0.1 | JWT стратегия |
| `@prisma/client` | 5.22.0 | ORM клиент |
| `@nestjs/config` | 4.0.2 | Конфигурация через .env |
| `@nestjs/swagger` | 11.2.0 | OpenAPI документация |
| `@nestjs/throttler` | 6.4.0 | Rate limiting |
| `@nestjs/event-emitter` | 3.0.1 | Событийная система |
| `@nestjs/websockets` | 11.1.6 | WebSocket поддержка |
| `@nestjs/microservices` | 11.1.9 | TCP микросервис |
| `nestjs-pino` | 4.5.0 | Структурированное логирование |
| `nestjs-zod` | 5.0.1 | Zod валидация DTO |
| `class-validator` | 0.14.2 | Валидация входных данных |
| `class-transformer` | 0.5.1 | Трансформация данных |
| `argon2` | 0.44.0 | Хэширование паролей |
| `minio` | 8.0.7 | MinIO S3 клиент |
| `@aws-sdk/client-s3` | 3.686.0 | AWS S3 presigned URLs |
| `@aws-sdk/s3-request-presigner` | 3.686.0 | Presigned URL генератор |
| `ioredis` | 5.8.0 | Redis клиент |
| `socket.io` | 4.8.3 | WebSocket чат |
| `slugify` | 1.6.6 | Генерация slug |
| `uuid` | 13.0.0 | Генерация UUID |
| `zod` | 4.1.11 | Schema валидация |

### Dev зависимости

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| `prisma` | 5.22.0 | Prisma CLI / миграции |
| `jest` | 30.0.0 | Тестирование |
| `ts-jest` | 29.2.5 | TypeScript поддержка для Jest |
| `@nestjs/testing` | 11.0.1 | NestJS тест утилиты |
| `typescript` | 5.6.3 | Компилятор |
| `@evilmartians/lefthook` | 2.1.4 | Pre-commit хуки |

---

## 2. Интеграции

### База данных — MySQL + Prisma
- Подключение через `DATABASE_URL` в `.env`
- ORM: Prisma 5.22.0
- 24 миграции
- Провайдер: `PrismaService` (глобальный, экспортируется из `PrismaModule`)

### Файловое хранилище — MinIO (S3-compatible)
- Клиент: `minio` 8.0.7 + `@aws-sdk`
- Провайдер: `MinioService` (из `MinioModule`)
- Конфигурация через `.env`: `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- Функции: загрузка файлов, генерация presigned URL, удаление
- Используется в: Projects, ContractorAttachments, Company, User (аватары), Conversations

### JWT Авторизация
- Модуль: `@nestjs/jwt` + `passport-jwt`
- Access token: **24 часа**
- Refresh token: **30 дней**
- Guard: `JwtGuard` (применяется на уровне контроллера/метода)
- Стратегия: `JwtStrategy`

### WebSocket — Socket.io
- Пакет: `@nestjs/platform-socket.io` + `socket.io` 4.8.3
- Gateway: `ChatGateway` (в ConversationsModule)
- Назначение: real-time чат между клиентом и исполнителем

### TCP Микросервис
- Транспорт: `Transport.TCP`
- Host: `0.0.0.0`, Port: `3006`
- Команды: `auth.validate`, `auth.refresh`

### Rate Limiting
- Пакет: `@nestjs/throttler` 6.4.0
- Лимит: **750 запросов / 60 секунд** (глобально)
- Guard: `ThrottlerGuard` (глобальный через APP_GUARD)

### Логирование
- Пакет: `nestjs-pino` + `pino-http` + `pino-pretty`
- Структурированные JSON логи в production
- Pretty-print в development

### Events
- Пакет: `@nestjs/event-emitter` 3.0.1
- Используется в: Conversations → асинхронные уведомления при новых сообщениях

### Swagger (OpenAPI)
- URL: `/docs`
- Bearer Auth через JWT
- Схема доступна по: `/docs/json` (используется OWASP ZAP для DAST)

---

## 3. API Маршруты

> ✅ — требует JWT авторизацию | ❌ — публичный эндпоинт

### Auth — `/api/v1/auth`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| POST | `/api/v1/auth/register` | ❌ | Регистрация нового пользователя |
| POST | `/api/v1/auth/login` | ❌ | Вход по email + password |
| GET | `/api/v1/auth/me` | ✅ | Профиль текущего пользователя |
| PATCH | `/api/v1/auth/me` | ✅ | Обновить имя пользователя |
| GET | `/api/v1/auth/me/profile` | ✅ | Базовый профиль пользователя |
| POST | `/api/v1/auth/refresh` | ❌ | Обновить токены по refreshToken |
| GET | `/api/v1/auth/contractors` | ❌ | 4 рекомендованных исполнителя |
| GET | `/api/v1/auth/projects` | ❌ | 4 рекомендованных проекта |

### Projects — `/projects`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| POST | `/projects` | ✅ | Создать проект |
| GET | `/projects` | ✅ | Список проектов с фильтрацией |
| GET | `/projects/:projectId` | ❌ | Получить проект по ID |
| PATCH | `/projects/:id` | ✅ | Обновить проект |
| DELETE | `/projects/:projectId` | ✅ | Удалить проект |
| POST | `/projects/:projectId/attachments/upload` | ✅ | Загрузить изображение к проекту |
| GET | `/projects/:projectId/attachments` | ❌ | Список изображений проекта |
| PATCH | `/projects/:projectId/cover/:attachmentId` | ✅ | Установить обложку проекта |
| DELETE | `/projects/:projectId/attachments/:attachmentId` | ✅ | Удалить изображение |
| POST | `/projects/:projectId/files` | ✅ | Загрузить документ к проекту |
| GET | `/projects/:projectId/files` | ❌ | Список документов проекта |
| PATCH | `/projects/:projectId/status` | ✅ | Изменить статус проекта |
| POST | `/projects/:projectId/views` | ✅ | Зарегистрировать просмотр |

### Contractor Profile — `/api/v1/contractor-profile`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| GET | `/api/v1/contractor-profile/me` | ✅ | Профиль текущего исполнителя |
| GET | `/api/v1/contractor-profile/profile/:contractorId` | ❌ | Публичный профиль исполнителя |
| PATCH | `/api/v1/contractor-profile/me` | ✅ | Обновить профиль исполнителя |
| DELETE | `/api/v1/contractor-profile/me` | ✅ | Удалить профиль |
| PUT | `/api/v1/contractor-profile/:contractorId/services` | ✅ | Полная замена списка услуг |
| GET | `/api/v1/contractor-profile/rating/by-contractor/:contractorId` | ❌ | Рейтинг исполнителя |
| GET | `/api/v1/contractor-profile/rating/by-user` | ✅ | Рейтинг текущего пользователя |

### Conversations — `/api/v1/conversations`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| POST | `/api/v1/conversations/:projectId/contact` | ✅ | Начать контакт по проекту |
| POST | `/api/v1/conversations/start` | ✅ | Начать новую беседу |
| GET | `/api/v1/conversations/mine` | ✅ | Мои беседы (пагинация) |
| GET | `/api/v1/conversations/last/chats` | ✅ | Последние 2 беседы |
| GET | `/api/v1/conversations/unread/count` | ✅ | Количество непрочитанных |
| GET | `/api/v1/conversations/messages/:conversationId` | ✅ | Сообщения беседы |
| POST | `/api/v1/conversations/messages/:conversationId` | ✅ | Отправить текстовое сообщение |
| POST | `/api/v1/conversations/messages/:conversationId/file` | ✅ | Отправить файл |
| GET | `/api/v1/conversations/:conversationId/messages/timeline` | ✅ | Timeline с курсором |
| POST | `/api/v1/conversations/read/:messageId` | ✅ | Отметить прочитанным |
| POST | `/api/v1/conversations/chat/update/:chatId` | ✅ | Обновить беседу |

### Search & Cities — `/api/v1`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| GET | `/api/v1/cities` | ❌ | Список городов (пагинация) |
| GET | `/api/v1/cities/suggest` | ❌ | Автодополнение по городам |
| GET | `/api/v1/search/contractors` | ❌ | Поиск исполнителей |
| GET | `/api/v1/search/projects` | ❌ | Поиск проектов |

### Services — `/api/v1/services`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| GET | `/api/v1/services` | ❌ | Список услуг (пагинация) |
| GET | `/api/v1/services/cover` | ❌ | Услуги для главной (макс. 8) |
| GET | `/api/v1/services/popular/services` | ❌ | Популярные услуги |
| GET | `/api/v1/services/:id` | ❌ | Услуга по ID |
| PUT | `/api/v1/services/:id/cover` | ❌ | Флаг обложки |
| PUT | `/api/v1/services/:id/icon` | ❌ | Установить iconUrl |
| POST | `/api/v1/services/:id/icon/presign` | ❌ | Загрузить иконку |
| PUT | `/api/v1/services/:id/categories` | ❌ | Обновить категории услуги |

### Categories — `/api/v1/categories`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| GET | `/api/v1/categories` | ❌ | Список категорий |
| POST | `/api/v1/categories` | ❌ | Создать категорию |
| GET | `/api/v1/categories/:id` | ❌ | Категория по ID |
| PATCH | `/api/v1/categories/:id` | ❌ | Обновить категорию |
| DELETE | `/api/v1/categories/:id` | ❌ | Удалить категорию |

### Favorites — `/favorites`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| POST | `/favorites` | ✅ | Добавить проект в избранное |
| DELETE | `/favorites/:projectId` | ✅ | Удалить проект из избранного |
| GET | `/favorites` | ✅ | Мои избранные проекты |
| POST | `/favorites/contractor/:contractorId` | ✅ | Добавить исполнителя в избранное |
| DELETE | `/favorites/contractor/:contractorId` | ✅ | Удалить исполнителя из избранного |
| GET | `/favorites/contactors` | ✅ | Мои избранные исполнители |

### Reviews — `/reviews`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| POST | `/reviews` | ✅ | Создать отзыв |
| POST | `/reviews/with-files` | ✅ | Создать отзыв с фотографиями |
| GET | `/reviews/contractor/:contractorId` | ❌ | Опубликованные отзывы исполнителя |
| GET | `/reviews/me` | ✅ | Мои отзывы |

### Notifications — `/notification`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| GET | `/notification` | ✅ | Уведомления (опция: onlyUnread) |
| PATCH | `/notification/:id/read` | ✅ | Отметить как прочитанное |
| POST | `/notification/:id/respond` | ✅ | Ответить на алерт (accept/reject) |

### Recommendations — `/recommendations`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| GET | `/recommendations/contractors/by-project/:projectId` | ❌ | Исполнители под проект |
| GET | `/recommendations/projects/by-contractor` | ✅ | Проекты для исполнителя |
| GET | `/recommendations/contractors/for-client` | ✅ | Исполнители для клиента |

### Showcase — `/ShowCases`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| GET | `/ShowCases/projects/:projectId/showcase` | ✅ | Витрина проекта |
| POST | `/ShowCases/projects/:projectId/showcase` | ✅ | Установить витрину (до 3 позиций) |
| PATCH | `/ShowCases/projects/:projectId/showcase/reorder` | ✅ | Переупорядочить |
| DELETE | `/ShowCases/projects/:projectId/showcase/:attachmentId` | ✅ | Удалить из витрины |
| GET | `/ShowCases/contractors/:contractorId/showcase` | ✅ | Витрина исполнителя |
| POST | `/ShowCases/contractors/:contractorId/showcase` | ✅ | Установить витрину |
| PATCH | `/ShowCases/contractors/:contractorId/showcase/reorder` | ✅ | Переупорядочить |
| DELETE | `/ShowCases/contractors/:contractorId/showcase/:attachmentId` | ✅ | Удалить |

### Uploads — `/api/v1/uploads`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| GET | `/api/v1/uploads/test` | ✅ | Тест соединения с MinIO |
| POST | `/api/v1/uploads/presign` | ✅ | Получить presigned URL для загрузки |

### User — `/api/v1/users`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| POST | `/api/v1/users/me/avatar` | ✅ | Загрузить аватарку (multipart) |
| POST | `/api/v1/users/me/avatar-url` | ✅ | Установить аватарку по URL |
| DELETE | `/api/v1/users/me/avatar` | ✅ | Удалить аватарку |
| PATCH | `/api/v1/users/my/city/:cityId` | ✅ | Изменить город пользователя |
| PATCH | `/api/v1/users/my/city/contractor/:cityId` | ✅ | Изменить город исполнителя |
| GET | `/api/v1/users/:userId/avatar/download` | ✅ | Скачать аватарку (редирект) |

### Company — `/companies` и `/company-images`

| Метод | Путь | Auth | Описание |
|-------|------|------|---------|
| POST | `/companies` | ✅ | Создать компанию |
| GET | `/companies/:id/employees` | ✅ | Список сотрудников |
| POST | `/companies/:id/employees` | ✅ | Добавить сотрудника |
| DELETE | `/companies/employees/:employeeId` | ✅ | Удалить сотрудника |
| PATCH | `/companies/employees/:employeeId/role` | ✅ | Изменить роль |
| PATCH | `/companies/employees/:employeeId/position` | ✅ | Изменить должность |
| POST | `/company-images/:companyId` | ✅ | Загрузить изображение компании |
| GET | `/company-images/:companyId` | ✅ | Список изображений |
| GET | `/company-images/:companyId/:id` | ✅ | Скачать изображение |
| DELETE | `/company-images/:companyId/:id` | ✅ | Удалить изображение |

---

## 4. База данных

### ENUM типы

| Enum | Значения |
|------|---------|
| `UserRole` | CLIENT, CONTRACTOR, ADMIN, BUSINESS |
| `ProjectStatus` | OPEN, IN_TALK, CLOSED, ARCHIVED |
| `Plan` | FREE, PRO |
| `CompanyPurpose` | LOGISTICS, SERVICES, GOODS |
| `CompanyRole` | HEAD, MANAGEMENT, EMPLOYEE |
| `PremisesType` | APARTMENT, HOUSE, OFFICE, RETAIL, WAREHOUSE, OTHER |
| `ReviewStatus` | PENDING, PUBLISHED, REJECTED |
| `NotificationType` | INFO, ALERT |
| `NotificationStatus` | UNREAD, READ, PENDING, ACCEPTED, REJECTED |

### Модели

#### User
```
id            String        CUID, PK
role          UserRole
email         String        unique
phone         String?
passwordHash  String
name          String
avatarUrl     String?
plan          Plan          default: FREE
planUntil     DateTime?
isBanned      Boolean       default: false
cityId        String?       → City
```

#### Contractor
```
id          String    CUID, PK
userId      String    unique → User
companyName String?
about       String?
cityId      String?   → City
companyId   String?   → Company
```

#### Project
```
id                      String          CUID, PK
clientId                String          → User
title                   String
description             String?
status                  ProjectStatus   default: OPEN
propertyType            PremisesType?
area                    Float?
budgetEstimated         Float?
cityId                  String?         → City
responsibleContractorId String?         → Contractor
coverAttachmentId       String?         → Attachment
```

#### Conversation
```
id           String   CUID, PK
projectId    String   → Project
clientId     String   → User
contractorId String   → Contractor
```

#### Message
```
id             String    CUID, PK
conversationId String    → Conversation
senderId       String    → User
text           String?
attachmentUrl  String?
fileUrl        String?
fileName       String?
fileMime       String?
fileSize       Int?
readAt         DateTime?
```

#### City
```
id      String   PK
slug    String   unique
nameRu String
nameKk String?
nameEn String?
```

#### Service
```
id          String   CUID, PK
slug        String   unique
name        String
description String?
iconUrl     String?
isCoverser  Boolean  default: false
isActive    Boolean  default: true
```

#### Category
```
id   String   CUID, PK
name String
```

#### Notification
```
id        String             CUID, PK
userId    String             → User
type      NotificationType
status    NotificationStatus default: UNREAD
title     String
message   String
data      Json?
createdAt DateTime
readAt    DateTime?
```

#### Review
```
id           String        CUID, PK
userId       String        → User
contractorId String        → Contractor
projectId    String?       → Project
rating       Int
text         String?
status       ReviewStatus  default: PENDING
createdAt    DateTime
publishedAt  DateTime?
```

#### Subscription
```
id         String   CUID, PK
userId     String   unique → User
plan       Plan
startedAt  DateTime
expiresAt  DateTime
paymentRef String?
isActive   Boolean
```

#### Attachment
```
id        String   CUID, PK
projectId String   → Project
url       String
mime      String?
sortOrder Int      default: 0
```

#### ContractorAttachment
```
id           String   CUID, PK
contractorId String   → Contractor
filename     String
path         String
mimetype     String
size         Int
```

#### Favorite
```
id        String   CUID, PK
userId    String   → User
projectId String   → Project
          unique(userId, projectId)
```

#### FavoriteContractor
```
id           String   CUID, PK
userId       String   → User
contractorId String   → Contractor
             unique(userId, contractorId)
```

#### ProjectView
```
id          String   CUID, PK
projectId   String   → Project
userId      String?  → User
fingerprint String?
```

#### Company
```
id          String          CUID, PK
name        String
description String?
purpose     CompanyPurpose?
logoUrl     String?
userId      String          → User (менеджер)
```

#### CompanyEmployee
```
id        String      CUID, PK
companyId String      → Company
userId    String      → User
position  String?
role      CompanyRole default: EMPLOYEE
isActive  Boolean     default: true
```

### Миграции

Всего **24 миграции** (октябрь 2025 — настоящее время):

```
20251010 - init
20251013 - fix_project_category_relation
20251020 - add_project_filters_fields
20251021 - add_city_reference
20251027 - add_service_model
20251028 - project_contractor_service_links
20251029 - add_showcase_images
20251101 - fix_contractor_showcase_fk
20251102 - add_favorites
20251103 - add_favorite_contractors
+ ещё 14 миграций
```

### Команды

```bash
# Применить миграции
yarn prisma migrate deploy

# Создать новую миграцию (dev)
yarn prisma migrate dev --name название

# Открыть Prisma Studio
yarn prisma studio

# Сгенерировать клиент
yarn prisma generate
```

---

## 5. Seed данные

```bash
yarn db:seed
```

### Города (25 городов Казахстана)

| Slug | nameRu | nameKk | nameEn |
|------|--------|--------|--------|
| astana | Астана | Астана | Astana |
| almaty | Алматы | Алматы | Almaty |
| shymkent | Шымкент | Шымкент | Shymkent |
| aktobe | Актобе | Ақтөбе | Aktobe |
| atyrau | Атырау | Атырау | Atyrau |
| aktau | Актау | Ақтау | Aktau |
| oral | Орал (Уральск) | Орал | Oral |
| kostanay | Костанай | Қостанай | Kostanay |
| pavlodar | Павлодар | Павлодар | Pavlodar |
| petropavl | Петропавловск | Петропавл | Petropavl |
| kokshetau | Кокшетау | Көкшетау | Kokshetau |
| karaganda | Караганда | Қарағанды | Karaganda |
| temirtau | Темиртау | Теміртау | Temirtau |
| balqash | Балхаш | Балқаш | Balkhash |
| ekibastuz | Экибастуз | Екібастұз | Ekibastuz |
| kyzylorda | Кызылорда | Қызылорда | Kyzylorda |
| taraz | Тараз | Тараз | Taraz |
| taldykorgan | Талдыкорган | Талдықорған | Taldykorgan |
| konaev | Конаев | Қонаев | Konaev |
| turkistan | Туркестан | Түркістан | Turkistan |
| semei | Семей | Семей | Semey |
| oskemen | Усть-Каменогорск | Өскемен | Oskemen |
| ridder | Риддер | Риддер | Ridder |
| zhanaozen | Жанаозен | Жаңаөзен | Zhanaozen |
| rudny | Рудный | Рудный | Rudny |

### Услуги (32 услуги по категориям)

| Категория | Услуги |
|-----------|--------|
| Ремонт | Ремонт под ключ, Косметический ремонт, Дизайн-ремонт |
| Электрика | Электромонтаж, Слаботочные системы |
| Сантехника | Сантехника, Отопление, Водоснабжение |
| Полы | Стяжка, Паркет, Ламинат, Плитка на пол |
| Отделка | Плитка, Штукатурка, Покраска, Обои |
| Столярка | Двери, Окна, Мебель на заказ |
| Строительство | Фундамент, Кладка, Кровля, Фасады |
| Благоустройство | Озеленение, Ландшафт |
| Проектирование | Дизайн интерьера, Архитектурный проект |

---

## 6. Guards и безопасность

| Guard | Применение | Описание |
|-------|-----------|---------|
| `JwtGuard` | Большинство эндпоинтов | Проверка JWT access token |
| `ProjectOwnerGuard` | Мутации проекта | Проверка владельца или ADMIN роли |
| `ThrottlerGuard` | Глобально | 750 req / 60 сек |

### Публичные эндпоинты (без JWT)

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/contractors`
- `GET /api/v1/auth/projects`
- `GET /api/v1/categories/*`
- `GET /api/v1/services/*`
- `GET /api/v1/cities/*`
- `GET /api/v1/search/*`
- `GET /projects/:projectId`
- `GET /reviews/contractor/:contractorId`
- `GET /recommendations/contractors/by-project/:projectId`
- `GET /api/v1/contractor-profile/profile/:contractorId`
