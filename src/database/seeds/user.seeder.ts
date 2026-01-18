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

        const existingRolesCount = await roleRepository.count();
        if (existingRolesCount >= rolesData.length) {
            console.log('ℹ️ Roles already exist, skipping roles seeding');
        } else {
            await roleRepository.upsert(rolesData, {
                conflictPaths: ['name'],
                skipUpdateIfNoValuesChanged: true,
            });
            console.log(`✅ Created/updated ${rolesData.length} roles`);
        }

        const createdRoles = await roleRepository.find({
            where: { name: In(rolesData.map((r) => r.name)) },
        });

        const departmentsData: DepartmentData[] = [];
        for (const tenant of tenants) {
            departmentsData.push(
                { name: 'Administrativo', tenantId: tenant.id },
                { name: 'Desenvolvimento', tenantId: tenant.id },
                { name: 'Suporte', tenantId: tenant.id },
                { name: 'Comercial', tenantId: tenant.id },
            );
        }

        const existingDepartmentsCount = await departmentRepository.count();
        if (existingDepartmentsCount >= departmentsData.length) {
            console.log('ℹ️ Departments already exist, skipping departments seeding');
        } else {
            await departmentRepository.upsert(departmentsData, {
                conflictPaths: ['name', 'tenantId'],
                skipUpdateIfNoValuesChanged: true,
            });
            console.log(`✅ Created/updated ${departmentsData.length} departments`);
        }

        const createdDepartments = await departmentRepository.find({
            where: {
                name: In(departmentsData.map((d) => d.name)),
                tenantId: In(tenants.map((t) => t.id)),
            },
        });

        // Create users if they don't exist
        const existingUsersCount = await userRepository.count();
        if (existingUsersCount >= 13) {
            console.log('ℹ️ Users already exist, skipping user seeding');
        } else {
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
            console.log(`✅ Created/updated ${usersData.length} users`);
        }
    }
}
