import { Module } from '@nestjs/common';
import { ContractorAttachmentsController } from './contractor-attachments.controller';
import { ContractorAttachmentsService } from './contractor-attachments.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ContractorAttachmentsController],
  providers: [ContractorAttachmentsService, PrismaService],
})
export class ContractorAttachmentsModule {}
