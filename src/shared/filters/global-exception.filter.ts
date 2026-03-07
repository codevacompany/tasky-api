import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';

/**
 * Global exception filter: catches every unhandled exception (including DB/TypeORM errors),
 * logs it, then delegates to Nest's default response handling.
 * Registered via APP_FILTER in AppModule so you don't need try/catch in controllers or services.
 */
@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    constructor(httpAdapterHost: HttpAdapterHost) {
        super(httpAdapterHost.httpAdapter);
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof Error ? exception.message : String(exception);
        const stack = exception instanceof Error ? exception.stack : undefined;

        const logContext = {
            method: request.method,
            url: request.url,
            statusCode: status,
        };

        if (status >= 500 || !(exception instanceof HttpException)) {
            this.logger.error(
                `Unhandled exception: ${message}`,
                stack,
                JSON.stringify(logContext),
            );
        } else {
            this.logger.warn(
                `HTTP exception: ${message} - ${request.method} ${request.url}`,
                JSON.stringify(logContext),
            );
        }

        super.catch(exception, host);
    }
}
