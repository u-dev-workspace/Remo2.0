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


@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
        EventEmitterModule.forRoot(),
    ],
    providers: [
        // 👇 глобально подключаем ThrottlerGuard
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule {}
