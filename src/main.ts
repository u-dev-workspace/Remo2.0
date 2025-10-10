// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, new FastifyAdapter({ logger: true }));
    const config = app.get(ConfigService);
    
    // CORS origins из .env, например: CORS_ORIGINS=http://localhost:5500,http://localhost:8080
    const origins = (config.get<string>('CORS_ORIGINS') || '').split(',').filter(Boolean);

    // Регистрируем cors-плагин fastify (важно!)
    const fastify = app.getHttpAdapter().getInstance();
    await fastify.register(multipart, {
        limits: { fileSize: 20 * 1024 * 1024 }, // ограничение 20 MB
    });
    await fastify.register(cors, {
        origin: origins.length
          ? (origin, cb) => cb(null, !!origin && origins.includes(origin))
          : true, // разрешить все (для dev)
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    });

    app.useWebSocketAdapter(new IoAdapter(app)); // адаптер Socket.IO
    app.useGlobalFilters(new AllExceptionsFilter());

    // Swagger (как у тебя)
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Remo API')
      .setDescription('API для платформы подбора подрядчиков (ремонт/стройка)')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, { customSiteTitle: 'Remo API Docs' });

    await app.listen(config.get('PORT') || 8080, '0.0.0.0');
    console.log('HTTP listening on', config.get('PORT') || 8080);
}
bootstrap();
