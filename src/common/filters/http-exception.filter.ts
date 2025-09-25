// src/common/filters/http-exception.filter.ts
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const reply = ctx.getResponse<FastifyReply>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: any = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            message = typeof res === 'string' ? res : (res as any).message ?? exception.message;
        } else if (exception instanceof Error) {
            // В dev можно возвращать текст ошибки, а в prod — общий текст
            message = process.env.NODE_ENV === 'development' ? exception.message : message;
        }

        // В dev — логируем стек
        if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error(exception);
        }

        reply.status(status).send({
            statusCode: status,
            message,
            // можно добавить error: HttpStatus[status] или код, если нужно
        });
    }
}
