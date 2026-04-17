import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { MetricsService } from './metrics.service';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res() reply: FastifyReply) {
    const metricsData = await this.metrics.getMetrics();
    reply.header('Content-Type', this.metrics.getContentType());
    reply.send(metricsData);
  }
}
