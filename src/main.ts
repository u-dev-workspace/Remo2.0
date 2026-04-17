import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import fs from 'fs';
import { Logger } from 'nestjs-pino';
import { Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Папка для файлов
  const uploadDir = join(process.cwd(), 'uploads', 'images');
  fs.mkdirSync(uploadDir, { recursive: true });

  // Fastify instance
  const fastify = app.getHttpAdapter().getInstance();

  await fastify.register(fastifyStatic, {
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
    setHeaders: (res, path) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (path.endsWith('.jpg') || path.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
      if (path.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    },
  });

  await fastify.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

  app.enableCors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // Health check — используется Swarm/load balancer для проверки готовности реплики
  fastify.get('/health', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

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

  // Микросервис (TCP) — оставь, но порт проверь, чтобы не был занят
  app.connectMicroservice({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 3006 },
  });
  await app.startAllMicroservices();


  const port = Number(process.env.PORT) || 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 HTTP listening on http://127.0.0.1:${port}`);
}

bootstrap();
