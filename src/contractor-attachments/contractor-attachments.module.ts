import { Module } from '@nestjs/common';
import { ContractorAttachmentsController } from './contractor-attachments.controller';
import { ContractorAttachmentsService } from './contractor-attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [ContractorAttachmentsController],
  providers: [ContractorAttachmentsService, PrismaService],
})
export class ContractorAttachmentsModule {}
