import { Injectable } from '@nestjs/common';
import { DepartmentService } from 'src/modules/department/department.service'; // Import the DepartmentService
import { UserService } from 'src/modules/user/user.service';
import { TenantService } from '../../modules/tenant/tenant.service';
import { RoleRepository } from '../../modules/role/role.repository';
import { RoleName } from '../../modules/role/entities/role.entity';
import { AccessProfile } from '../../shared/common/access-profile';

@Injectable()
export class DatabaseSeederService {
    constructor(
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
        private readonly tenantService: TenantService,
        private readonly roleRepository: RoleRepository,
    ) {}

    async seedTenant() {
        const newTenant = { name: 'Codeva', customKey: 'CDV', isInternal: true };

        // Check if tenant exists by name or customKey
        const existingTenantByName = await this.tenantService.findByName(newTenant.name);
        const existingTenantByKey = await this.tenantService.findByCustomKey(newTenant.customKey);

        let tenant;
        if (!existingTenantByName && !existingTenantByKey) {
            tenant = await this.tenantService.create(newTenant);
        } else {
            tenant = existingTenantByName || existingTenantByKey;
        }

        return tenant;
    }

    async seedRoles() {
        const roleNames = Object.values(RoleName);

        for (const name of roleNames) {
            const existingRole = await this.roleRepository.findOneBy({ name });
            if (!existingRole) {
                await this.roleRepository.save(this.roleRepository.create({ name }));
            }
        }

        return this.roleRepository.findOneByOrFail({ name: RoleName.GlobalAdmin });
    }

    async seedDepartment() {
        const tenant = await this.seedTenant();
        const globalAdminRole = await this.seedRoles();

        const newDepartment = { name: 'Diretoria' };

        const mockAcessProfile = {
            roleId: globalAdminRole.id,
            tenantId: tenant.id,
        } as AccessProfile;

        const existingDepartment = await this.departmentService.findByName(
            mockAcessProfile,
            newDepartment.name,
        );

        let department;
        if (!existingDepartment) {
            department = await this.departmentService.create(mockAcessProfile, newDepartment);
        } else {
            department = existingDepartment;
        }

        return { department, mockAcessProfile };
    }

    async seedUsers() {
        const { department, mockAcessProfile } = await this.seedDepartment();

        const newUser1 = {
            firstName: 'Isaac',
            lastName: 'Silva',
            email: 'isaacensilva@gmail.com',
            password: 'Admin1234',
            isAdmin: true,
            departmentId: department.id,
            roleId: mockAcessProfile.roleId,
        };

        const existingUser1 = await this.userService.findByEmail(mockAcessProfile, newUser1.email);

        if (!existingUser1) {
            await this.userService.create(mockAcessProfile, newUser1);
        }

        const userRole = await this.roleRepository.findOneBy({ name: RoleName.User });

        const newUser2 = {
            firstName: 'Rayandson',
            lastName: 'Silva',
            email: 'rayandson.silva321@gmail.com',
            password: 'User1234',
            isAdmin: true,
            departmentId: department.id,
            roleId: userRole.id,
        };

        const existingUser2 = await this.userService.findByEmail(mockAcessProfile, newUser2.email);

        if (!existingUser2) {
            await this.userService.create(mockAcessProfile, newUser2);
        }
    }
}
