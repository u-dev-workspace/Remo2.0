// src/contractor-attachments/attachments.debug.controller.ts
import { Controller, Post, Req, BadRequestException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { join } from 'path';
import { promises as fs, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

@Controller('_debug/attachments')
export class AttachmentsDebugController {
  @Post()
  async upload(@Req() req: FastifyRequest) {
    const mpFile = await (req as any).file();
    if (!mpFile) throw new BadRequestException('Файл не передан (multipart/form-data, поле "file")');

    const dir = join(process.cwd(), 'uploads', '_debug');
    await fs.mkdir(dir, { recursive: true });

    const out = join(dir, mpFile.filename);
    await pipeline(mpFile.file, createWriteStream(out));

    return { ok: true, saved: `/uploads/_debug/${mpFile.filename}` };
  }
}
