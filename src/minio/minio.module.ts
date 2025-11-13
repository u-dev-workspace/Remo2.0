import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { MinioService } from './minio.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'MINIO_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const endPoint =
          configService.get<string>('MINIO_ENDPOINT') ?? 'localhost';

        const port = Number(configService.get<string>('MINIO_PORT') ?? '9000');
        const useSSL =
          (configService.get<string>('MINIO_USE_SSL') ?? 'false') === 'true';

        const accessKey =
          configService.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin';
        const secretKey =
          configService.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin';

        return new Client({
          endPoint,
          port,
          useSSL,
          accessKey,
          secretKey,
        });
      },
    },
    MinioService,
  ],
  exports: [MinioService], // 👈 ОБЯЗАТЕЛЬНО
})
export class MinioModule {}
