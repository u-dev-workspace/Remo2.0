import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register = new client.Registry();

  /** HTTP-запросы: количество по method + route + status */
  readonly httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
  });

  /** HTTP-запросы: длительность в секундах */
  readonly httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

  /** Активные подключения прямо сейчас */
  readonly httpActiveRequests = new client.Gauge({
    name: 'http_active_requests',
    help: 'Number of active HTTP requests',
  });

  onModuleInit() {
    // Регистрируем дефолтные Node.js метрики (memory, CPU, GC, event loop lag)
    client.collectDefaultMetrics({ register: this.register });

    // Регистрируем кастомные
    this.register.registerMetric(this.httpRequestsTotal);
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpActiveRequests);
  }

  /** Возвращает все метрики в формате Prometheus text/plain */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
