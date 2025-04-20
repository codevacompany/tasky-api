import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { uid } from 'uid';
import { CustomInternalServerErrorException } from '../exceptions/http-exception';

/**
 * Check the [Atlas Docs](https://atlas.cloudplusplus.nl) for more information
 */
export interface AccessProfileParams {
    roleId?: number;
    tenantId?: number;
    userId?: number;
}

/**
 * Check the [Atlas Docs](https://atlas.cloudplusplus.nl) for more information
 */
export class AccessProfile {
    id = uid();

    roleId = 0;

    tenantId = 0;

    userId = 0;

    constructor(params?: AccessProfileParams) {
        this.update(params);
    }

    update(params?: AccessProfileParams): AccessProfile {
        if (params?.roleId || params?.roleId === 0) {
            if (params?.roleId <= 0) {
                throw new CustomInternalServerErrorException({
                    code: 'cannot-set-role-id-to-zero-or-lower',
                    message: 'Cannot set role ID to zero or lower',
                });
            }

            this.roleId = params.roleId;
        }

        if (params?.tenantId || params?.tenantId === 0) {
            if (params?.tenantId <= 0) {
                throw new CustomInternalServerErrorException({
                    code: 'cannot-set-tenant-id-to-zero-or-lower',
                    message: 'Cannot set Tenant ID to zero or lower',
                });
            }

            this.tenantId = params.tenantId;
        }

        if (params?.userId || params?.userId === 0) {
            if (params?.userId <= 0) {
                throw new CustomInternalServerErrorException({
                    code: 'cannot-set-user-id-to-zero-or-lower',
                    message: 'Cannot set User ID to zero or lower',
                });
            }

            this.userId = params.userId;
        }

        return this;
    }
}

interface AccessProfileRequest extends Request {
    accessProfile: AccessProfile;
}

/**
 * Check the [Atlas Docs](https://atlas.cloudplusplus.nl) for more information
 */
export const GetAccessProfile = createParamDecorator((_, executionContext: ExecutionContext) => {
    return executionContext.switchToHttp().getRequest().user as AccessProfile;
});

/**
 * Check the [Atlas Docs](https://atlas.cloudplusplus.nl) for more information
 */
export function putAccessProfileOnRequest(
    executionContext: ExecutionContext,
    accessProfile: AccessProfile,
) {
    (executionContext.switchToHttp().getRequest() as AccessProfileRequest).accessProfile =
        accessProfile;
}
