import { Injectable, OnModuleInit } from '@nestjs/common';
import { DepartmentService } from 'src/modules/department/department.service'; // Import the DepartmentService
import { UserService } from 'src/modules/user/user.service';
import { TenantService } from '../../modules/tenant/tenant.service';
import { RoleRepository } from '../../modules/role/role.repository';
import { RoleName } from '../../modules/role/entities/role.entity';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
    constructor(
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
        private readonly tenantService: TenantService,
        private readonly roleRepository: RoleRepository,
    ) {}

    async onModuleInit() {
        await this.seedUser();
    }

    async seedTenant() {
        const newTenant = { name: 'Codeva', customKey: 'CDV' };

        const existingTenant = await this.tenantService.findByName(newTenant.name);

        let tenant;
        if (!existingTenant) {
            tenant = await this.tenantService.create(newTenant);
        } else {
            tenant = existingTenant;
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

        const mockAdminUser = {
            roleId: globalAdminRole.id,
            tenantId: tenant.id,
        } as any;

        const existingDepartment = await this.departmentService.findByName(mockAdminUser, newDepartment.name);

        let department;
        if (!existingDepartment) {
            department = await this.departmentService.create(mockAdminUser, newDepartment);
        } else {
            department = existingDepartment;
        }

        return { department, mockAdminUser };
    }

    async seedUser() {
        const { department, mockAdminUser } = await this.seedDepartment();

        const newUser = {
            firstName: 'Isaac',
            lastName: 'Silva',
            email: 'isaacensilva@gmail.com',
            password: 'Admin1234',
            isAdmin: true,
            departmentId: department.id,
            roleId: mockAdminUser.roleId,
        };

        const existingUser = await this.userService.findByEmail(newUser.email);

        if (!existingUser) {
            await this.userService.create(mockAdminUser, newUser, department.tenantId);
        }
    }
}
