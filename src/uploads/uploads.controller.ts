// src/uploads/uploads.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { JwtGuard } from '../common/guards/jwt.guard';

@Controller('api/v1/uploads')
@UseGuards(JwtGuard) // только авторизованные
export class UploadsController {
    constructor(private uploads: UploadsService) {}
    @Get('test')
    async testConnection() {
        try {
            const res = this.uploads['s3'].config.endpoint; // ✅ не вызываем как функцию
            console.log('MinIO endpoint:', res);
            return { status: 'ok', endpoint: res };
        } catch (e) {
            console.error('Connection failed:', e);
            throw new Error('Connection failed');
        }
    }

    @Post('presign')
    presign(@Body() body: { projectId: string; mime: string; sizeBytes: number; ext?: string }) {
        return this.uploads.createPresignedPut(body.projectId, body.mime, body.sizeBytes, body.ext);
    }
}
