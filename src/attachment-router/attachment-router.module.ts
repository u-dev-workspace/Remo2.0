

// src/attachment-router/attachment-router.module.ts
import { Module } from '@nestjs/common';
import { AttachmentRouterController } from './attachment-router.controller';
import { AttachmentRouterService } from './attachment-router.service';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [AttachmentRouterController],
  providers: [AttachmentRouterService],
})
export class AttachmentRouterModule {}
