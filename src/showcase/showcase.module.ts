import { Module } from '@nestjs/common';
import { ShowcaseController } from './showcase.controller';
import { ShowcaseService } from './showcase.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ShowcaseController],
  providers: [ShowcaseService, PrismaService],
})
export class ShowcaseModule {}
