import { Module } from '@nestjs/common';
import { ContractorAttachmentsController } from './contractor-attachments.controller';
import { ContractorAttachmentsService } from './contractor-attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Module({
  controllers: [ContractorAttachmentsController],
  providers: [ContractorAttachmentsService, PrismaService, UploadsService],
})
export class ContractorAttachmentsModule {}
