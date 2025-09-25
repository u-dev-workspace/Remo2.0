// src/uploads/uploads.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const ALLOWED = ['image/jpeg','image/png','image/webp','image/heic','image/avif'];

@Injectable()
export class UploadsService {
    private s3: S3Client;
    private bucket = process.env.S3_BUCKET!;
    private publicUrl = process.env.S3_PUBLIC_URL || '';
    private maxSize = Number(process.env.MAX_IMAGE_SIZE_MB || 20) * 1024 * 1024;

    constructor() {
        this.s3 = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            endpoint: process.env.S3_ENDPOINT,
            forcePathStyle: true,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY!,
                secretAccessKey: process.env.S3_SECRET_KEY!,
            },
        });
    }

    async createPresignedPut(projectId: string, mime: string, sizeBytes: number, ext?: string) {
        if (!ALLOWED.includes(mime)) throw new BadRequestException('Unsupported mime');
        if (sizeBytes > this.maxSize) throw new BadRequestException('File too large');

        const safeExt = (ext || this.extFromMime(mime) || 'jpg').replace(/[^a-z0-9]/gi,'');
        const key = `projects/${projectId}/${randomUUID()}.${safeExt}`;

        const command = new (await import('@aws-sdk/client-s3')).PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: mime,
            ACL: 'public-read', // если бакет приватный — убери и раздавай через signed GET
        });

        const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 60 * 5 });
        const url = this.publicUrl ? `${this.publicUrl}/${key}` : key;
        return { uploadUrl, objectKey: key, url, headers: { 'Content-Type': mime } };
    }

    async deleteObject(objectKey: string) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    }

    private extFromMime(m: string) {
        if (m === 'image/jpeg') return 'jpg';
        if (m === 'image/png') return 'png';
        if (m === 'image/webp') return 'webp';
        if (m === 'image/avif') return 'avif';
        if (m === 'image/heic') return 'heic';
        return null;
    }
}
