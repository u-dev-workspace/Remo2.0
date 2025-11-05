// src/conversations/conversations.module.ts
import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../prisma/prisma.service';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../auth/auth.module';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsModule } from '../notifications/notifications.module';


@Module({
    imports: [
        AuthModule,
        NotificationsModule,// <- здесь появится JwtService
        EventEmitterModule.forRoot(), // <- для @OnEvent
    ],
    controllers: [ConversationsController],
    providers: [ConversationsService, ChatGateway, PrismaService],
    exports: [ConversationsService],
})
export class ConversationsModule {}
