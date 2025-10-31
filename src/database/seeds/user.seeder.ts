import { DataSource, In } from 'typeorm';
import { Seeder } from '@jorgebodega/typeorm-seeding';
import { User } from '../../modules/user/entities/user.entity';
import { Role, RoleName } from '../../modules/role/entities/role.entity';
import { Department } from '../../modules/department/entities/department.entity';
import { Tenant } from '../../modules/tenant/entities/tenant.entity';
import * as bcrypt from 'bcrypt';

interface RoleData {
    name: string;
}

interface DepartmentData {
    name: string;
    tenantId: number;
}

interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    isActive: boolean;
    departmentId: number;
    roleId: number;
    tenantId: number;
}

export class UserSeeder extends Seeder {
    async run(dataSource: DataSource): Promise<void> {
        console.log('👥 Seeding users, roles, and departments...');

        const roleRepository = dataSource.getRepository(Role);
        const departmentRepository = dataSource.getRepository(Department);
        const userRepository = dataSource.getRepository(User);
        const tenantRepository = dataSource.getRepository(Tenant);

        // Only seed users for tenants created by TenantSeeder
        const seededCustomKeys = process.env.APP_ENV === 'dev' ? ['CDV', 'EMP', 'STT'] : ['CDV'];
        const tenants = await tenantRepository.find({ where: { customKey: In(seededCustomKeys) } });
        if (tenants.length === 0) {
            console.log('⚠️ No tenants found. Please run TenantSeeder first.');
            return;
        }

        const rolesData: RoleData[] = [
            { name: RoleName.GlobalAdmin },
            { name: RoleName.TenantAdmin },
            { name: RoleName.Supervisor },
            { name: RoleName.User },
        ];

        await roleRepository.upsert(rolesData, {
            conflictPaths: ['name'],
            skipUpdateIfNoValuesChanged: true,
        });

        const createdRoles: Role[] = [];
        for (const roleData of rolesData) {
            const role = await roleRepository.findOne({ where: { name: roleData.name } });
            if (role) createdRoles.push(role);
        }
        console.log(`✅ Created/updated ${createdRoles.length} roles`);

        const departmentsData: DepartmentData[] = [];
        for (const tenant of tenants) {
            departmentsData.push(
                { name: 'Administrativo', tenantId: tenant.id },
                { name: 'Desenvolvimento', tenantId: tenant.id },
                { name: 'Suporte', tenantId: tenant.id },
                { name: 'Comercial', tenantId: tenant.id },
            );
        }

        await departmentRepository.upsert(departmentsData, {
            conflictPaths: ['name', 'tenantId'],
            skipUpdateIfNoValuesChanged: true,
        });

        const createdDepartments: Department[] = [];
        for (const deptData of departmentsData) {
            const department = await departmentRepository.findOne({
                where: { name: deptData.name, tenantId: deptData.tenantId },
            });
            if (department) createdDepartments.push(department);
        }
        console.log(`✅ Created/updated ${createdDepartments.length} departments`);

        // Create users
        const hashedPassword = await bcrypt.hash('User@1234', 10);

        const globalAdminRole = createdRoles.find((r) => r.name === RoleName.GlobalAdmin);
        const tenantAdminRole = createdRoles.find((r) => r.name === RoleName.TenantAdmin);
        const userRole = createdRoles.find((r) => r.name === RoleName.User);

        const usersData: UserData[] = [];

        // Create global admin (belongs to internal tenant)
        const internalTenant = tenants.find((t) => t.isInternal);
        const internalAdminDept = createdDepartments.find(
            (d) => d.tenantId === internalTenant?.id && d.name === 'Administrativo',
        );

        if (internalTenant && internalAdminDept) {
            if (process.env.APP_ENV === 'production') {
                usersData.push({
                    firstName: 'Isaac',
                    lastName: 'Silva',
                    email: 'isaac@codeva.com.br',
                    password: hashedPassword,
                    isActive: true,
                    departmentId: internalAdminDept.id,
                    roleId: globalAdminRole!.id,
                    tenantId: internalTenant.id,
                });
            } else {
                usersData.push({
                    firstName: 'Admin',
                    lastName: 'Global',
                    email: 'admin@tasky.com.br',
                    password: hashedPassword,
                    isActive: true,
                    departmentId: internalAdminDept.id,
                    roleId: globalAdminRole!.id,
                    tenantId: internalTenant.id,
                });
            }
        }

        if (process.env.APP_ENV !== 'production') {
            for (const tenant of tenants) {
                const tenantDepartments = createdDepartments.filter(
                    (d) => d.tenantId === tenant.id,
                );
                const adminDept = tenantDepartments.find((d) => d.name === 'Administrativo');
                const devDept = tenantDepartments.find((d) => d.name === 'Desenvolvimento');
                const supportDept = tenantDepartments.find((d) => d.name === 'Suporte');

                if (adminDept && devDept && supportDept) {
                    // Tenant Admin
                    usersData.push({
                        firstName: 'Admin',
                        lastName: tenant.name.split(' ')[0],
                        email: `admin@${tenant.customKey.toLowerCase()}.com.br`,
                        password: hashedPassword,
                        isActive: true,
                        departmentId: adminDept.id,
                        roleId: tenantAdminRole!.id,
                        tenantId: tenant.id,
                    });

                    // Regular users
                    usersData.push(
                        {
                            firstName: 'João',
                            lastName: 'Silva',
                            email: `joao@${tenant.customKey.toLowerCase()}.com.br`,
                            password: hashedPassword,
                            isActive: true,
                            departmentId: devDept.id,
                            roleId: userRole!.id,
                            tenantId: tenant.id,
                        },
                        {
                            firstName: 'Maria',
                            lastName: 'Santos',
                            email: `maria@${tenant.customKey.toLowerCase()}.com.br`,
                            password: hashedPassword,
                            isActive: true,
                            departmentId: supportDept.id,
                            roleId: userRole!.id,
                            tenantId: tenant.id,
                        },
                        {
                            firstName: 'Pedro',
                            lastName: 'Costa',
                            email: `pedro@${tenant.customKey.toLowerCase()}.com.br`,
                            password: hashedPassword,
                            isActive: true,
                            departmentId: adminDept.id,
                            roleId: userRole!.id,
                            tenantId: tenant.id,
                        },
                    );
                }
            }
        }

        await userRepository.upsert(usersData, {
            conflictPaths: ['email'],
            skipUpdateIfNoValuesChanged: true,
        });

        const createdUsers: User[] = [];
        for (const userData of usersData) {
            const user = await userRepository.findOne({ where: { email: userData.email } });
            if (user) createdUsers.push(user);
        }

        console.log(`✅ Created/updated ${createdUsers.length} users`);
        console.log('📧 Default password for all users: 123456');
    }
}
