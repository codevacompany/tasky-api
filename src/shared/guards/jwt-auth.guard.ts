import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { jwtVerifyFailureDetails } from '../utils/jwt-verify-error.util';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    handleRequest<TUser>(
        err: Error | undefined,
        user: TUser,
        info: unknown,
        context: ExecutionContext,
        status?: number,
    ): TUser {
        void status;
        if (err || !user) {
            const req = context.switchToHttp().getRequest<Request>();
            if (info instanceof Error) {
                this.logger.warn({
                    message: 'Access JWT rejected',
                    ...jwtVerifyFailureDetails(info),
                    method: req.method,
                    path: req.path,
                });
            } else if (err) {
                const reason = err instanceof Error ? err.message : String(err);
                this.logger.warn({
                    message: 'JWT strategy failed after token verified',
                    reason,
                    method: req.method,
                    path: req.path,
                });
            }
            throw err ?? new UnauthorizedException();
        }
        return user;
    }
}
