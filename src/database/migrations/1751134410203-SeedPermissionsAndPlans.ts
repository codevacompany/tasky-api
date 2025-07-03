import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPermissionsAndPlans1751134410203 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert permissions
        await queryRunner.query(`
            INSERT INTO permission (key, name, description) VALUES
            -- User Management
            ('manage_users', 'Gerenciar Usuários', 'Criar, editar e remover usuários'),
            ('view_all_users', 'Ver Todos os Usuários', 'Visualizar lista completa de usuários'),

            -- Analytics & Reports
            ('view_basic_analytics', 'Analytics Básicos', 'Dashboards e métricas simples'),
            ('view_advanced_analytics', 'Analytics Avançados', 'Dashboards detalhados e métricas avançadas'),
            ('export_reports', 'Exportar Relatórios', 'Exportar relatórios em PDF/Excel'),
            ('view_department_analytics', 'Analytics por Departamento', 'Ver métricas específicas por departamento'),

            -- Notifications
            ('email_notifications', 'Notificações por Email', 'Receber notificações via email'),
            ('sms_notifications', 'Notificações por SMS', 'Receber notificações via SMS'),

            -- Departments
            ('manage_department_supervisors', 'Supervisores de Departamento', 'Adicionar supervisores aos departamentos'),
            ('view_department_reports', 'Relatórios de Departamento', 'Ver relatórios específicos do departamento'),

            -- Tickets
            ('create_tickets', 'Criar Tickets', 'Criar novos tickets'),
            ('assign_tickets', 'Atribuir Tickets', 'Atribuir tickets para outros usuários'),
            ('view_all_tickets', 'Ver Todos os Tickets', 'Visualizar tickets de todos os departamentos'),

            -- Integrations
            ('api_access', 'Acesso à API', 'Usar APIs para integrações'),
            ('webhook_integrations', 'Integrações Webhook', 'Configurar webhooks'),

            -- Support
            ('priority_support', 'Suporte Prioritário', 'Acesso ao suporte prioritário'),
            ('dedicated_support', 'Suporte Dedicado', 'Suporte dedicado 24/7')
        `);

        // Insert subscription plans
        await queryRunner.query(`
            INSERT INTO subscription_plan (name, slug, max_users, price_monthly, price_yearly, description) VALUES
            ('Plano Iniciante', 'iniciante', 5, 99.00, 950.00, 'Ideal para microempresas e startups'),
            ('Plano Crescer', 'crescer', 15, 199.00, 1900.00, 'Ideal para pequenas empresas em crescimento'),
            ('Plano Profissional', 'profissional', 30, 399.00, 3800.00, 'Ideal para empresas médias'),
            ('Usuários Adicionais', 'adicional', NULL, 15.00, 150.00, 'Para empresas em expansão')
        `);

        // Get plan and permission IDs for mapping
        const planIniciante = await queryRunner.query(
            `SELECT id FROM subscription_plan WHERE slug = 'iniciante'`,
        );
        const planCrescer = await queryRunner.query(
            `SELECT id FROM subscription_plan WHERE slug = 'crescer'`,
        );
        const planProfissional = await queryRunner.query(
            `SELECT id FROM subscription_plan WHERE slug = 'profissional'`,
        );
        const planAdicional = await queryRunner.query(
            `SELECT id FROM subscription_plan WHERE slug = 'adicional'`,
        );

        // Plano Iniciante permissions
        await queryRunner.query(`
            INSERT INTO subscription_plan_permission (subscription_plan_id, permission_id)
            SELECT ${planIniciante[0].id}, id FROM permission
            WHERE key IN (
                'create_tickets',
                'view_basic_analytics',
                'manage_users'
            )
        `);

        // Plano Crescer permissions
        await queryRunner.query(`
            INSERT INTO subscription_plan_permission (subscription_plan_id, permission_id)
            SELECT ${planCrescer[0].id}, id FROM permission
            WHERE key IN (
                'create_tickets',
                'assign_tickets',
                'view_basic_analytics',
                'manage_users',
                'view_all_users',
                'email_notifications'
            )
        `);

        // Plano Profissional permissions (all permissions)
        await queryRunner.query(`
            INSERT INTO subscription_plan_permission (subscription_plan_id, permission_id)
            SELECT ${planProfissional[0].id}, id FROM permission
            WHERE key IN (
                'create_tickets',
                'assign_tickets',
                'view_all_tickets',
                'view_basic_analytics',
                'view_advanced_analytics',
                'view_department_analytics',
                'export_reports',
                'manage_users',
                'view_all_users',
                'manage_department_supervisors',
                'email_notifications',
                'api_access',
                'priority_support'
            )
        `);

        // Usuários Adicionais permissions (same as Profissional)
        await queryRunner.query(`
            INSERT INTO subscription_plan_permission (subscription_plan_id, permission_id)
            SELECT ${planAdicional[0].id}, id FROM permission
            WHERE key IN (
                'create_tickets',
                'assign_tickets',
                'view_all_tickets',
                'view_basic_analytics',
                'view_advanced_analytics',
                'view_department_analytics',
                'export_reports',
                'manage_users',
                'view_all_users',
                'manage_department_supervisors',
                'email_notifications',
                'api_access',
                'priority_support'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove plan-permission mappings
        await queryRunner.query(`DELETE FROM subscription_plan_permission`);

        // Remove subscription plans
        await queryRunner.query(`DELETE FROM subscription_plan`);

        // Remove permissions
        await queryRunner.query(`DELETE FROM permission`);
    }
}
