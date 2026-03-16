// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProjectsModule } from './projects/projects.module';
import { ConversationsModule } from './conversations/conversations.module';
import { UploadsModule } from './uploads/uploads.module';
import { ContractorProfileModule } from './contractor-profile/contractor-profile.module';
import { ContractorAttachmentsModule } from './contractor-attachments/contractor-attachments.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { UserModule } from './user/user.module';
import { SearchModule } from './search/search.module';
import { ServicesModule } from './services/services.module';
import { ShowcaseModule } from './showcase/showcase.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MinioModule } from './minio/minio.module';
import { AttachmentRouterModule } from './attachment-router/attachment-router.module';
import { CompanyService } from './company/company.service';
import { CompanyModule } from './company/company.module';
import { LoggerModule } from 'nestjs-pino';




@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([{ ttl: 60, limit: 750 }]),
        PrismaModule,
        AuthModule,
        CategoriesModule,
        ProjectsModule,
        ConversationsModule,
        UploadsModule,
        ContractorProfileModule,
        ContractorAttachmentsModule,
        RecommendationsModule,
        UserModule,
        SearchModule,
        ServicesModule,
        ShowcaseModule,
        FavoritesModule,
        ReviewsModule,
        NotificationsModule,
        MinioModule,
        AttachmentRouterModule,
        CompanyModule,
        EventEmitterModule.forRoot(),
        LoggerModule.forRoot({
            pinoHttp: {
                // формат в консоль (как “ERROR ... key=value ...”)
                customLogLevel: (_req, res, err) => {
                    if (err || res.statusCode >= 500) return 'error';
                    if (res.statusCode >= 400) return 'warn';
                    return 'info';
                },
                transport: {
                    target: 'pino-pretty',
                    options: {
                        singleLine: true,
                        colorize: false,          // как в Loki обычно лучше без цветов
                        translateTime: 'UTC:yyyy-mm-dd"T"HH:MM:ss.l"Z"',
                        messageKey: 'msg',
                        errorKey: 'err',
                        ignore: 'pid,hostname',   // можно убрать лишнее
                    },
                },

                // полезные поля
                customProps: (req) => ({
                    container: process.env.HOSTNAME, // в докере HOSTNAME = id контейнера
                    service: process.env.SERVICE_NAME || 'remo-service-api',
                }),
            },
        }),
    ],
    providers: [
        // 👇 глобально подключаем ThrottlerGuard
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule {}
