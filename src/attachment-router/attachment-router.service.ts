import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { FastifyReply } from 'fastify';

@Injectable()
export class AttachmentRouterService {
  private readonly logger = new Logger(AttachmentRouterService.name);

  constructor(private readonly minio: MinioService) {}

  async serveObject(objectKey: string, res: FastifyReply) {
    this.logger.debug(`Serve object from MinIO: "${objectKey}"`);

    let contentType = 'application/octet-stream';
    let contentLength: number | undefined;

    try {
      // 1. statObject — достанем метаданные, если есть
      try {
        const stat = await this.minio.statObject(objectKey);

        if (stat.metaData?.['content-type']) {
          contentType = stat.metaData['content-type'];
        }

        if (typeof stat.size === 'number') {
          contentLength = stat.size;
        }
      } catch (e: any) {
        this.logger.warn(
          `statObject failed for "${objectKey}": ${e?.code ?? e?.message}`,
        );
      }

      // 2. сам объект
      const stream = await this.minio.getObjectStream(objectKey);

      // 3. выставляем заголовки через FastifyReply
      res.header('Content-Type', contentType);
      if (contentLength !== undefined) {
        res.header('Content-Length', contentLength.toString());
      }

      // 4. отдаём поток (Fastify умеет отправлять Node streams)
      return res.send(stream);
    } catch (e: any) {
      this.logger.error(
        `Failed to serve "${objectKey}": ${e?.code ?? e?.message}`,
        e?.stack,
      );

      return res.status(500).send({
        message: 'MinIO error',
        code: e?.code,
        name: e?.name,
        error: e?.message,
      });
    }
  }
}
