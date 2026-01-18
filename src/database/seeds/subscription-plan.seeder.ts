import { DataSource } from 'typeorm';
import { Seeder } from '@jorgebodega/typeorm-seeding';
import { SubscriptionPlan } from '../../modules/subscription-plan/entities/subscription-plan.entity';
import { SubscriptionPlanPermission } from '../../modules/subscription-plan/entities/subscription-plan-permission.entity';
import { Permission } from '../../modules/permission/entities/permission.entity';

interface PlanData {
    name: string;
    slug: string;
    maxUsers: number | null;
    priceMonthly: number;
    priceYearly: number;
    description: string;
    permissions: string[];
}

export class SubscriptionPlanSeeder extends Seeder {
    async run(dataSource: DataSource): Promise<void> {
        console.log('💳 Seeding subscription plans...');

        const planRepository = dataSource.getRepository(SubscriptionPlan);
        const permissionRepository = dataSource.getRepository(Permission);
        const planPermissionRepository = dataSource.getRepository(SubscriptionPlanPermission);

        const plansData: PlanData[] = [
            {
                name: 'Plano Básico',
                slug: 'basico',
                maxUsers: 5,
                priceMonthly: 99.0,
                priceYearly: 950.0,
                description: 'Ideal para microempresas e startups',
                permissions: [],
            },
            {
                name: 'Plano Essencial',
                slug: 'essencial',
                maxUsers: 15,
                priceMonthly: 199.0,
                priceYearly: 1900.0,
                description: 'Ideal para pequenas empresas em crescimento',
                permissions: [
                    'view_basic_analytics',
                    'view_department_analytics',
                    'email_notifications',
                ],
            },
            {
                name: 'Plano Avançado',
                slug: 'avancado',
                maxUsers: 30,
                priceMonthly: 399.0,
                priceYearly: 3800.0,
                description: 'Ideal para empresas médias',
                permissions: [
                    'view_basic_analytics',
                    'view_advanced_analytics',
                    'view_department_analytics',
                    'view_users_analytics',
                    'export_reports',
                    'email_notifications',
                ],
            },
            {
                name: 'Plano Customizado',
                slug: 'customizado',
                maxUsers: null,
                priceMonthly: 399.0,
                priceYearly: 3800.0,
                description: 'Ideal para grandesempresas',
                permissions: [
                    'view_basic_analytics',
                    'view_advanced_analytics',
                    'view_department_analytics',
                    'view_users_analytics',
                    'export_reports',
                    'email_notifications',
                ],
            },
        ];

        const existingPlansCount = await planRepository.count();
        if (existingPlansCount >= plansData.length) {
            console.log('ℹ️ Subscription plans already exist, skipping plan seeding');
            return;
        }

        for (const planData of plansData) {
            await planRepository.upsert(
                {
                    name: planData.name,
                    slug: planData.slug,
                    maxUsers: planData.maxUsers,
                    priceMonthly: planData.priceMonthly,
                    priceYearly: planData.priceYearly,
                    description: planData.description,
                },
                {
                    conflictPaths: ['slug'],
                    skipUpdateIfNoValuesChanged: true,
                },
            );

            const plan = await planRepository.findOne({ where: { slug: planData.slug } });

            let permissions: Permission[] = [];
            if (planData.permissions.length > 0) {
                permissions = await permissionRepository.find({
                    where: planData.permissions.map((key) => ({ key })),
                });
            }

            const planPermissions = permissions.map((permission) => ({
                subscriptionPlanId: plan!.id,
                permissionId: permission.id,
            }));

            if (planPermissions.length > 0) {
                await planPermissionRepository.upsert(planPermissions, {
                    conflictPaths: ['subscriptionPlanId', 'permissionId'],
                    skipUpdateIfNoValuesChanged: true,
                });
            }

            console.log(
                `✅ Created/updated plan: ${plan!.name} with ${permissions.length} permissions`,
            );
        }

        console.log(`✅ Created/updated ${plansData.length} subscription plans`);
    }
}
