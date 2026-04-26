import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!req) return next.handle(); // WebSocket или TCP — пропускаем

    const method: string = req.method ?? 'UNKNOWN';
    const route: string =
      req.routeOptions?.url ??
      req.routerPath ??
      req.url?.split('?')[0] ??
      '/';

    // Пропускаем сам /metrics чтобы не было рекурсии
    if (route === '/metrics') return next.handle();

    const contentLength = parseInt(req.headers?.['content-length'] ?? '0', 10);
    if (contentLength > 0) {
      this.metrics.httpRequestSize.observe({ method, route }, contentLength);
    }

    this.metrics.httpActiveRequests.inc();
    const endTimer = this.metrics.httpRequestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = String(res.statusCode ?? 200);
          const statusClass = `${statusCode[0]}xx`;

          endTimer({ status_code: statusCode });
          this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode, status_class: statusClass });
          this.metrics.httpActiveRequests.dec();

          // Размер ответа
          const resLength = parseInt(res.getHeader?.('content-length') ?? '0', 10);
          if (resLength > 0) {
            this.metrics.httpResponseSize.observe({ method, route, status_code: statusCode }, resLength);
          }

          // Считаем 4xx и 5xx как ошибки
          const code = res.statusCode ?? 200;
          if (code >= 400) {
            this.metrics.httpErrorsTotal.inc({ method, route, status_code: statusCode });
          }
        },
        error: (err) => {
          const statusCode = String(err.status ?? err.statusCode ?? 500);
          const statusClass = `${statusCode[0]}xx`;

          endTimer({ status_code: statusCode });
          this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode, status_class: statusClass });
          this.metrics.httpErrorsTotal.inc({ method, route, status_code: statusCode });
          this.metrics.httpActiveRequests.dec();
        },
      }),
    );
  }
}
