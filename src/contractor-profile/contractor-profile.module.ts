import { Module } from '@nestjs/common';
import { ContractorProfileService } from './contractor-profile.service';
import { ContractorProfileController } from './contractor-profile.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ContractorProfileController],
  providers: [ContractorProfileService, PrismaService],
  exports: [ContractorProfileService],
})
export class ContractorProfileModule {}
