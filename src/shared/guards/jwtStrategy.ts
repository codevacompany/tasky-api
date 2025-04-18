import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../modules/user/user.service';
import { CustomUnauthorizedException } from '../exceptions/http-exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly usersService: UserService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.TOKEN_SECRET,
        });
    }

    async validate(payload: any): Promise<any> {
        if (!payload.sub.tenantId) {
            throw new CustomUnauthorizedException({
                code: 'authorization-header-required',
                message: 'An authorization header is required',
            });
        }

        const user = await this.usersService.findById(payload.sub.userId);

        if (!user) {
            throw new UnauthorizedException('Invalid token');
        }

        return user;
    }
}
