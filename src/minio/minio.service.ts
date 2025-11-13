// src/minio/minio.service.ts
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly bucket: string;

  constructor(
    @Inject('MINIO_CLIENT') private readonly minio: Client,
    private readonly configService: ConfigService,
  ) {
    // ВАЖНО: бакет "remo"
    this.bucket = this.configService.get<string>('MINIO_BUCKET') ?? 'remo';
  }

  async onModuleInit() {
    try {
      const exists = await this.minio.bucketExists(this.bucket);
      if (!exists) {
        await this.minio.makeBucket(this.bucket, '');
        this.logger.log(`Created MinIO bucket "${this.bucket}"`);
      } else {
        this.logger.log(`MinIO bucket "${this.bucket}" already exists`);
      }
    } catch (e) {
      this.logger.error(
        `Failed to init MinIO bucket "${this.bucket}": ${(e as any)?.message}`,
      );
    }
  }

  getBucketName(): string {
    return this.bucket;
  }

  generateObjectName(prefix: string, ext?: string): string {
    const ts = Date.now();
    const uuid = randomUUID();
    const safePrefix = prefix.replace(/^\//, '').replace(/\/$/, '');
    const safeExt = ext ? ext.replace(/^\./, '') : undefined;

    if (safeExt) {
      return `${safePrefix}/${ts}-${uuid}.${safeExt}`;
    }
    return `${safePrefix}/${ts}-${uuid}`;
  }

  async uploadBuffer(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    this.logger.debug(
      `Upload buffer to MinIO: ${this.bucket}/${objectName} (${mimeType})`,
    );

    await this.minio.putObject(this.bucket, objectName, buffer, undefined, {
      'Content-Type': mimeType,
    });

    return objectName;
  }

  async uploadStream(
    objectName: string,
    stream: Readable,
    size: number,
    mimeType: string,
  ): Promise<string> {
    this.logger.debug(
      `Upload stream to MinIO: ${this.bucket}/${objectName} (${mimeType}, size=${size})`,
    );

    await this.minio.putObject(this.bucket, objectName, stream, size, {
      'Content-Type': mimeType,
    });

    return objectName;
  }

  async getObjectStream(objectName: string): Promise<Readable> {
    this.logger.debug(
      `Get object from MinIO: ${this.bucket}/${objectName}`,
    );
    return this.minio.getObject(this.bucket, objectName);
  }

  async statObject(objectName: string) {
    this.logger.debug(
      `Stat object from MinIO: ${this.bucket}/${objectName}`,
    );
    return this.minio.statObject(this.bucket, objectName);
  }

  async getPresignedUrl(
    objectName: string,
    expirySeconds = 3600,
  ): Promise<string> {
    this.logger.debug(
      `Generate presigned URL for ${this.bucket}/${objectName} (exp=${expirySeconds}s)`,
    );

    return this.minio.presignedGetObject(
      this.bucket,
      objectName,
      expirySeconds,
    );
  }

  async getPublicUrl(objectName: string): Promise<string> {
    const base =
      this.configService.get<string>('MINIO_PUBLIC_ENDPOINT') ?? '';

    if (base) {
      const normalized = base.replace(/\/$/, '');
      return `${normalized}/${objectName}`;
    }

    return this.getPresignedUrl(objectName, 60 * 60 * 24);
  }

  async deleteObject(objectName: string): Promise<void> {
    this.logger.debug(
      `Delete object from MinIO: ${this.bucket}/${objectName}`,
    );
    await this.minio.removeObject(this.bucket, objectName);
  }
}
