import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [NotificationsService, PrismaService],
  exports: [NotificationsService], // <-- ОБЯЗАТЕЛЬНО экспортируем
})
export class NotificationsModule {}
