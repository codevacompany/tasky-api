import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RoleName } from '../../modules/role/entities/role.entity';
import { RoleRepository } from '../../modules/role/role.repository';
import { AccessProfile } from '../common/access-profile';
import { CustomUnauthorizedException } from '../exceptions/http-exception';

@Injectable()
export class GlobalAdminGuard implements CanActivate {
    constructor(private readonly roleRepository: RoleRepository) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AccessProfile;

        if (!user) {
            throw new CustomUnauthorizedException({
                code: 'unauthorized-user',
                message: 'User not authenticated',
            });
        }

        const globalAdminRole = await this.roleRepository.findOneBy({
            name: RoleName.GlobalAdmin,
        });

        if (!globalAdminRole) {
            throw new CustomUnauthorizedException({
                code: 'role-not-found',
                message: 'Global Admin role not found',
            });
        }

        if (user.roleId !== globalAdminRole.id) {
            throw new CustomUnauthorizedException({
                code: 'not-global-admin',
                message: 'Only Global Admins can access this resource',
            });
        }

        return true;
    }
}
