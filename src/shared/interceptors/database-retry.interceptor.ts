import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { retry } from 'rxjs/operators';

@Injectable()
export class DatabaseRetryInterceptor implements NestInterceptor {
    constructor(
        private readonly maxRetries = 2,
        private readonly retryDelayMs = 300,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            retry({
                count: this.maxRetries,
                resetOnSuccess: true,
                delay: (error) =>
                    this.shouldRetry(error) ? timer(this.retryDelayMs) : throwError(() => error),
            }),
        );
    }

    private shouldRetry(error: any): boolean {
        const message =
            typeof error?.message === 'string'
                ? error.message
                : typeof error?.response?.message === 'string'
                  ? error.response.message
                  : '';

        return message.includes('Authentication timed out');
    }
}
