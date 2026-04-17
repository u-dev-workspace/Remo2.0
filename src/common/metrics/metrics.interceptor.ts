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
    const method = req.method ?? 'UNKNOWN';

    // route = pattern из декоратора (напр. /projects/:id), fallback на URL
    const route = req.routeOptions?.url ?? req.routerPath ?? req.url ?? '/';

    this.metrics.httpActiveRequests.inc();
    const end = this.metrics.httpRequestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = String(res.statusCode ?? 200);
          end({ status_code: statusCode });
          this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode });
          this.metrics.httpActiveRequests.dec();
        },
        error: (err) => {
          const statusCode = String(err.status ?? err.statusCode ?? 500);
          end({ status_code: statusCode });
          this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode });
          this.metrics.httpActiveRequests.dec();
        },
      }),
    );
  }
}
