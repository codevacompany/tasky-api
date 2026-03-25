import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { jwtVerifyFailureDetails } from '../../utils/jwt-verify-error.util';

@Injectable()
export class TokenService {
    private readonly logger = new Logger(TokenService.name);

    constructor(private readonly jwtService: JwtService) {}

    readonly defaultAccessTokenExpiresIn = '1d';

    readonly defaultRefreshTokenExpiresIn = '30d';

    create(sub: Record<string, unknown> | string, options: JwtSignOptions = {}) {
        options.expiresIn = options.expiresIn ?? this.defaultAccessTokenExpiresIn;

        return this.jwtService.sign({ sub }, { ...options, secret: process.env.TOKEN_SECRET });
    }

    createPair(sub: Record<string, unknown> | string) {
        const accessToken = this.create(sub);
        const refreshToken = this.create(accessToken, {
            expiresIn: this.defaultRefreshTokenExpiresIn,
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    decode(token: string): any {
        try {
            return this.jwtService.decode(token);
        } catch (error) {
            return null;
        }
    }

    verify(token: string): string | JwtPayload {
        try {
            return this.jwtService.verify(token);
        } catch (error) {
            const details = jwtVerifyFailureDetails(error);
            this.logger.warn({
                message: 'JWT verify failed (refresh token or nested access payload)',
                tokenUse: 'refresh',
                ...details,
            });
            throw new ForbiddenException();
        }
    }
}
