import { DataSource } from 'typeorm';
import { Seeder } from '@jorgebodega/typeorm-seeding';
import { Permission } from '../../modules/permission/entities/permission.entity';

interface PermissionData {
    key: string;
    name: string;
    description: string;
}

export class PermissionSeeder extends Seeder {
    async run(dataSource: DataSource): Promise<void> {
        console.log('🔐 Seeding permissions...');

        const permissionRepository = dataSource.getRepository(Permission);

        const permissions: PermissionData[] = [
            {
                key: 'view_basic_analytics',
                name: 'Analytics Básicos',
                description: 'Dashboards e métricas simples',
            },
            {
                key: 'view_advanced_analytics',
                name: 'Analytics Avançados',
                description: 'Dashboards detalhados e métricas avançadas',
            },
            {
                key: 'export_reports',
                name: 'Exportar Relatórios',
                description: 'Exportar relatórios em PDF/Excel',
            },
            {
                key: 'view_department_analytics',
                name: 'Analytics por Departamento',
                description: 'Ver métricas específicas por departamento',
            },
            {
                key: 'view_users_analytics',
                name: 'Analytics por Usuários',
                description: 'Ver métricas específicas por usuários',
            },
            {
                key: 'email_notifications',
                name: 'Notificações por Email',
                description: 'Receber notificações via email',
            },
        ];

        await permissionRepository.upsert(permissions, {
            conflictPaths: ['key'],
            skipUpdateIfNoValuesChanged: true,
        });

        console.log(`✅ Created/updated ${permissions.length} permissions`);
    }
}
