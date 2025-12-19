import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';
import { AccessProfile } from '../common/access-profile';
import {
    CustomForbiddenException,
    CustomUnauthorizedException,
} from '../exceptions/http-exception';

@Injectable()
export class TermsAcceptanceRequiredGuard implements CanActivate {
    constructor(
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const accessProfile = request.user as AccessProfile;

        if (!accessProfile) {
            throw new CustomUnauthorizedException({
                code: 'unauthorized-user',
                message: 'User not authenticated',
            });
        }

        const user = await this.userService.findById(accessProfile.userId);

        if (!user) {
            throw new CustomUnauthorizedException({
                code: 'user-not-found',
                message: 'User not found',
            });
        }

        // Allow access to accept-terms endpoint even if terms not accepted
        const url = request.url;
        if (url && url.includes('/users/accept-terms')) {
            return true;
        }

        if (!user.termsAccepted || !user.privacyPolicyAccepted) {
            throw new CustomForbiddenException({
                code: 'terms-acceptance-required',
                message:
                    'You must accept the terms of use and privacy policy to access this resource',
            });
        }

        return true;
    }
}
