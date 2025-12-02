// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import fs from 'fs';
import { ThrottlerGuard } from '@nestjs/throttler';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.useLogger(['error', 'warn', 'log', 'debug']);
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = app.get(ConfigService);
  const fastify = app.getHttpAdapter().getInstance() as any; // 👈 важный any

  // 1. Папка для файлов
  const uploadDir = join(process.cwd(), 'uploads', 'images');
  fs.mkdirSync(uploadDir, { recursive: true });

  // 2. Статика /uploads/*
  await fastify.register(fastifyStatic, {
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
    setHeaders: (res, path) => {
      // Разрешаем CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Гарантируем корректный тип контента
      if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      }
      if (path.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      }
    },
  });


  // 3. Multipart
  await fastify.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  // 4. CORS — только тут, без @fastify/cors
  app.enableCors({
    origin: (origin, cb) => cb(null, true), // на проде лучше список доменов
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 5. WebSockets
  app.useWebSocketAdapter(new IoAdapter(app));

  // 6. Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Remo API')
    .setDescription('API для платформы подбора подрядчиков (ремонт/стройка)')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Remo API Docs',
  });

  const port = 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 HTTP listening on http://127.0.0.1:${port}`);

  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
  });
}

bootstrap();