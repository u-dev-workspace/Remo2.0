import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyImagesService } from './company-images.service'; // если используешь
import { MinioModule } from '../minio/minio.module';
import { CompanyImagesController } from './company-images.controller'; // <- важный import

@Module({
  imports: [
    MinioModule, // здесь появляется MINIO_CLIENT и MinioService
  ],
  controllers: [CompanyController, CompanyImagesController],
  providers: [
    PrismaService,
    CompanyService,
    CompanyImagesService, // если есть
  ],
  exports: [CompanyService, CompanyImagesService],
})
export class CompanyModule {}
