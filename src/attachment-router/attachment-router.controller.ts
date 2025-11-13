// src/attachment-router/attachment-router.controller.ts
import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AttachmentRouterService } from './attachment-router.service';

@Controller('files')
export class AttachmentRouterController {
  constructor(private readonly attachmentRouter: AttachmentRouterService) {}

  // Покрывает все пути после /files/*
  @Get('*')
  async serve(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const params = (req.params || {}) as any;

    // В зависимости от адаптера это может быть params['*'] или params['0']
    const objectKey: string | undefined =
      params['*'] ?? params['0'] ?? undefined;

    // Для /files/projects/... -> objectKey === 'projects/...'
    if (!objectKey) {
      return res.status(404).send({ message: 'File key is required' });
    }

    return this.attachmentRouter.serveObject(objectKey, res);
  }
}
