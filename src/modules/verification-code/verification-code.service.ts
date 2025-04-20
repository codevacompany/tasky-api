import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { DateTime } from 'luxon';
import { MoreThanOrEqual } from 'typeorm';
import { CustomNotFoundException } from '../../shared/exceptions/http-exception';
import { UserService } from '../user/user.service';
import { VerificationCodeRepository } from './verification-code.repository';
import { AccessProfile } from '../../shared/common/access-profile';

@Injectable()
export class VerificationCodeService {
    constructor(
        private readonly verificationCodeRepository: VerificationCodeRepository,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
    ) {}

    insert(code: string, email: string, tenantId: number) {
        const expiresAt = DateTime.now().plus({ hours: 1 }).toJSDate().toISOString();

        return this.verificationCodeRepository.save({ code, email, expiresAt, tenantId });
    }

    async find(accessProfile: AccessProfile, code: string, email: string) {
        const user = await this.userService.findByEmail(accessProfile, email);

        if (!user) {
            throw new CustomNotFoundException({
                code: 'email-not-found',
                message: 'This email is not registered',
            });
        }

        return this.verificationCodeRepository.findOne({
            where: {
                code,
                email,
            },
        });
    }

    async validate(accessProfile: AccessProfile, code: string, email: string) {
        const user = await this.userService.findByEmail(accessProfile, email);

        if (!user) {
            throw new CustomNotFoundException({
                code: 'email-not-found',
                message: 'This email is not registered',
            });
        }

        const validCode = await this.verificationCodeRepository.findOne({
            where: {
                code,
                email,
                expiresAt: MoreThanOrEqual(new Date()),
                isUsed: false,
            },
        });

        return {
            valid: validCode ? true : false,
            id: validCode?.id || undefined,
            code: validCode?.code || code,
            email: validCode?.email || email,
            expiresAt: validCode?.expiresAt || undefined,
        };
    }

    async generate() {
        const code = Math.floor(100000 + Math.random() * 900000);

        return code.toString();
    }

    async markAsUsed(id: number) {
        return this.verificationCodeRepository.update(id, { isUsed: true });
    }

    async delete(id: number) {
        return this.verificationCodeRepository.delete(id);
    }
}
