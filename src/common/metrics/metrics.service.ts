import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register = new client.Registry();

  // ── Информация о приложении ────────────────────────────────────
  readonly appInfo = new client.Gauge({
    name: 'app_info',
    help: 'Application build info (always 1)',
    labelNames: ['version', 'node_version', 'environment', 'service'] as const,
    registers: [this.register],
  });

  // ── HTTP метрики ───────────────────────────────────────────────
  readonly httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'status_class'] as const,
    registers: [this.register],
  });

  readonly httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.register],
  });

  readonly httpRequestSize = new client.Histogram({
    name: 'http_request_size_bytes',
    help: 'HTTP request size in bytes',
    labelNames: ['method', 'route'] as const,
    buckets: [100, 1_000, 10_000, 100_000, 1_000_000],
    registers: [this.register],
  });

  readonly httpResponseSize = new client.Histogram({
    name: 'http_response_size_bytes',
    help: 'HTTP response size in bytes',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [100, 1_000, 10_000, 100_000, 1_000_000],
    registers: [this.register],
  });

  readonly httpActiveRequests = new client.Gauge({
    name: 'http_active_requests',
    help: 'Number of active HTTP requests in flight',
    registers: [this.register],
  });

  readonly httpErrorsTotal = new client.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors (4xx + 5xx)',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.register],
  });

  // ── Бизнес метрики ─────────────────────────────────────────────
  readonly authAttemptsTotal = new client.Counter({
    name: 'auth_attempts_total',
    help: 'Total authentication attempts',
    labelNames: ['result'] as const, // success | failure
    registers: [this.register],
  });

  readonly projectsCreatedTotal = new client.Counter({
    name: 'projects_created_total',
    help: 'Total number of projects created',
    labelNames: ['status'] as const, // DRAFT | OPEN
    registers: [this.register],
  });

  readonly searchQueriesTotal = new client.Counter({
    name: 'search_queries_total',
    help: 'Total number of search queries',
    labelNames: ['type'] as const, // projects | contractors
    registers: [this.register],
  });

  readonly wsConnectionsActive = new client.Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
    registers: [this.register],
  });

  readonly wsMessagesTotal = new client.Counter({
    name: 'websocket_messages_total',
    help: 'Total WebSocket messages sent/received',
    labelNames: ['direction'] as const, // in | out
    registers: [this.register],
  });

  // ── Внешние зависимости ────────────────────────────────────────
  readonly dbQueryDuration = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'model'] as const,
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [this.register],
  });

  readonly dbQueryErrorsTotal = new client.Counter({
    name: 'db_query_errors_total',
    help: 'Total number of database query errors',
    labelNames: ['operation', 'model'] as const,
    registers: [this.register],
  });

  readonly minioOperationsTotal = new client.Counter({
    name: 'minio_operations_total',
    help: 'Total MinIO operations',
    labelNames: ['operation', 'result'] as const, // upload/download | success/failure
    registers: [this.register],
  });

  readonly minioOperationDuration = new client.Histogram({
    name: 'minio_operation_duration_seconds',
    help: 'MinIO operation duration in seconds',
    labelNames: ['operation'] as const,
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [this.register],
  });

  // ── Очередь / события ─────────────────────────────────────────
  readonly eventsEmittedTotal = new client.Counter({
    name: 'events_emitted_total',
    help: 'Total domain events emitted',
    labelNames: ['event'] as const,
    registers: [this.register],
  });

  onModuleInit() {
    // Дефолтные Node.js метрики:
    // process_cpu_*, process_heap_*, nodejs_eventloop_lag_*,
    // nodejs_gc_duration_*, nodejs_heap_space_*, nodejs_version_info и др.
    client.collectDefaultMetrics({
      register: this.register,
      labels: {
        service: process.env.SERVICE_NAME || 'remo-api',
        environment: process.env.NODE_ENV || 'development',
      },
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Метка с версией/окружением (всегда = 1, читается по labels)
    this.appInfo.labels({
      version: process.env.npm_package_version || '0.0.1',
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development',
      service: process.env.SERVICE_NAME || 'remo-api',
    }).set(1);
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
