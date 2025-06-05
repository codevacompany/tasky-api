import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RoleName } from '../../modules/role/entities/role.entity';
import { RoleRepository } from '../../modules/role/role.repository';
import { AccessProfile } from '../common/access-profile';
import { CustomUnauthorizedException } from '../exceptions/http-exception';

@Injectable()
export class TenantAdminGuard implements CanActivate {
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

        const tenantAdminRole = await this.roleRepository.findOneBy({
            name: RoleName.TenantAdmin,
        });

        const globalAdminRole = await this.roleRepository.findOneBy({
            name: RoleName.GlobalAdmin,
        });

        if (!tenantAdminRole || !globalAdminRole) {
            throw new CustomUnauthorizedException({
                code: 'role-not-found',
                message: 'Required roles not found',
            });
        }

        // Allow access if user is either Tenant Admin or Global Admin
        if (user.roleId !== tenantAdminRole.id && user.roleId !== globalAdminRole.id) {
            throw new CustomUnauthorizedException({
                code: 'not-admin',
                message: 'Only Tenant Admins and Global Admins can access this resource',
            });
        }

        return true;
    }
}
