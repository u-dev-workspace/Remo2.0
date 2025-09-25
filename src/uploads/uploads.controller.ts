// src/uploads/uploads.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { JwtGuard } from '../common/guards/jwt.guard';

@Controller('api/v1/uploads')
@UseGuards(JwtGuard) // только авторизованные
export class UploadsController {
    constructor(private uploads: UploadsService) {}

    @Post('presign')
    presign(@Body() body: { projectId: string; mime: string; sizeBytes: number; ext?: string }) {
        return this.uploads.createPresignedPut(body.projectId, body.mime, body.sizeBytes, body.ext);
    }
}
