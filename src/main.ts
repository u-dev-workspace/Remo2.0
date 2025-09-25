// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, new FastifyAdapter({ logger: true }));
    const config = app.get(ConfigService);

    const origins = (config.get<string>('CORS_ORIGINS') || '').split(',').filter(Boolean);
    app.enableCors({ origin: origins.length ? origins : true, credentials: true });
    app.useGlobalFilters(new AllExceptionsFilter());

    // Swagger
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Remo API')
        .setDescription('API для платформы подбора подрядчиков (ремонт/стройка)')
        .setVersion('1.0.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, { customSiteTitle: 'Remo API Docs' });

    await app.listen(config.get('PORT') || 8080, '0.0.0.0');
}
bootstrap();
