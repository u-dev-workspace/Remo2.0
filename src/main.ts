// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.useLogger(['error', 'warn', 'log', 'debug']);

  app.useGlobalFilters(new AllExceptionsFilter());
  const config = app.get(ConfigService);
  const fastify = app.getHttpAdapter().getInstance();

  // 🧩 1. Создаём папку uploads/images при запуске (если нет)
  const uploadDir = join(process.cwd(), 'uploads', 'images');
  fs.mkdirSync(uploadDir, { recursive: true });

  // 🧩 2. Подключаем fastify-static для отдачи файлов
  await (fastify as any).register(fastifyStatic, {
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/', // теперь файлы будут доступны по URL /uploads/...
  });

  // 🧩 3. Multipart (для загрузки файлов)
  await (fastify as any).register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 }, // ограничение 20 MB
  });

  // 🧩 4. CORS
  const origins = (config.get<string>('CORS_ORIGINS') || '').split(',').filter(Boolean);
  await (fastify as any).register(cors, {
    origin: origins.length
      ? (origin, cb) => cb(null, !!origin && origins.includes(origin))
      : true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 🧩 5. WebSockets + фильтры
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalFilters(new AllExceptionsFilter());

  // 🧩 6. Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Remo API')
    .setDescription('API для платформы подбора подрядчиков (ремонт/стройка)')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { customSiteTitle: 'Remo API Docs' });

  // 🧩 7. Стартуем сервер
  const port = 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 HTTP listening on http://127.0.0.1:${port}`);

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
  });

}

bootstrap();
