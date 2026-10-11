import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RoleName } from '../../modules/role/entities/role.entity';
import { RoleRepository } from '../../modules/role/role.repository';
import { AccessProfile } from '../common/access-profile';
import { CustomUnauthorizedException } from '../exceptions/http-exception';

@Injectable()
export class TenantAdminOrSupervisorGuard implements CanActivate {
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

        const [tenantAdminRole, globalAdminRole, supervisorRole] = await Promise.all([
            this.roleRepository.findOneBy({ name: RoleName.TenantAdmin }),
            this.roleRepository.findOneBy({ name: RoleName.GlobalAdmin }),
            this.roleRepository.findOneBy({ name: RoleName.Supervisor }),
        ]);

        if (!tenantAdminRole || !globalAdminRole || !supervisorRole) {
            throw new CustomUnauthorizedException({
                code: 'role-not-found',
                message: 'Required roles not found',
            });
        }

        const allowed = [tenantAdminRole.id, globalAdminRole.id, supervisorRole.id];
        if (!allowed.includes(user.roleId)) {
            throw new CustomUnauthorizedException({
                code: 'not-allowed',
                message:
                    'Only Tenant Admins, Global Admins and Supervisors can access this resource',
            });
        }

        return true;
    }
}
