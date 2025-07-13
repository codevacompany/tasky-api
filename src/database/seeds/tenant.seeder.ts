import { DataSource } from 'typeorm';
import { Seeder } from '@jorgebodega/typeorm-seeding';
import { Tenant } from '../../modules/tenant/entities/tenant.entity';
import { TenantSubscription } from '../../modules/tenant-subscription/entities/tenant-subscription.entity';
import { SubscriptionPlan } from '../../modules/subscription-plan/entities/subscription-plan.entity';
import { SubscriptionStatus } from '../../modules/tenant-subscription/entities/tenant-subscription.entity';

interface TenantData {
    name: string;
    email: string;
    phoneNumber?: string;
    customKey: string;
    cnpj?: string;
    isInternal: boolean;
    cep?: string;
    state?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    number?: string;
    companySize?: string;
    mainActivity?: string;
    termsAccepted: boolean;
    termsAcceptedAt?: Date;
    termsVersion?: string;
    privacyPolicyAccepted: boolean;
    privacyPolicyAcceptedAt?: Date;
    privacyPolicyVersion?: string;
}

export class TenantSeeder extends Seeder {
    async run(dataSource: DataSource): Promise<void> {
        console.log('🏢 Seeding tenants...');

        const tenantRepository = dataSource.getRepository(Tenant);
        const tenantSubscriptionRepository = dataSource.getRepository(TenantSubscription);
        const subscriptionPlanRepository = dataSource.getRepository(SubscriptionPlan);

        const profissionalPlan = await subscriptionPlanRepository.findOne({
            where: { slug: 'profissional' },
        });

        if (!profissionalPlan) {
            console.log('⚠️ Professional plan not found, skipping trial subscriptions');
        }

        const tenantsData: TenantData[] = [
            {
                name: 'Codeva LTDA',
                email: 'admin@tasky.com.br',
                phoneNumber: '+55 84 99999-9999',
                customKey: 'CDV',
                cnpj: '12.345.678/0001-90',
                isInternal: true,
                mainActivity: 'Desenvolvimento de Software',
                termsAccepted: true,
                termsAcceptedAt: new Date(),
                termsVersion: '1.0.0',
                privacyPolicyAccepted: true,
                privacyPolicyAcceptedAt: new Date(),
                privacyPolicyVersion: '1.0.0',
            },
        ];

        if (process.env.NODE_ENV === 'production') {
            await tenantRepository.upsert(tenantsData, {
                conflictPaths: ['customKey'],
                skipUpdateIfNoValuesChanged: true,
            });
        } else {
            tenantsData.push(
                {
                    name: 'Empresa Demo LTDA',
                    email: 'contato@empresademo.com.br',
                    phoneNumber: '+55 11 88888-8888',
                    customKey: 'EMP',
                    cnpj: '98.765.432/0001-10',
                    isInternal: false,
                    cep: '04567-890',
                    state: 'SP',
                    city: 'São Paulo',
                    neighborhood: 'Vila Madalena',
                    street: 'Rua Harmonia',
                    number: '123',
                    companySize: 'Média',
                    mainActivity: 'Consultoria',
                    termsAccepted: true,
                    termsAcceptedAt: new Date(),
                    termsVersion: '1.0.0',
                    privacyPolicyAccepted: true,
                    privacyPolicyAcceptedAt: new Date(),
                    privacyPolicyVersion: '1.0.0',
                },
                {
                    name: 'StartupTech Inovação',
                    email: 'hello@startuptech.com.br',
                    phoneNumber: '+55 11 77777-7777',
                    customKey: 'STT',
                    cnpj: '11.222.333/0001-44',
                    isInternal: false,
                    cep: '01234-567',
                    state: 'SP',
                    city: 'São Paulo',
                    neighborhood: 'Pinheiros',
                    street: 'Rua dos Pinheiros',
                    number: '456',
                    companySize: 'Pequena',
                    mainActivity: 'Tecnologia',
                    termsAccepted: true,
                    termsAcceptedAt: new Date(),
                    termsVersion: '1.0.0',
                    privacyPolicyAccepted: true,
                    privacyPolicyAcceptedAt: new Date(),
                    privacyPolicyVersion: '1.0.0',
                },
            );

            await tenantRepository.upsert(tenantsData, {
                conflictPaths: ['customKey'],
                skipUpdateIfNoValuesChanged: true,
            });
        }

        console.log(`✅ Created/updated ${tenantsData.length} tenants`);

        if (profissionalPlan) {
            console.log('💳 Creating trial subscriptions...');

            const createdTenants = await tenantRepository.find();
            const trialSubscriptions = [];

            for (const tenant of createdTenants) {
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days trial

                trialSubscriptions.push({
                    tenantId: tenant.id,
                    subscriptionPlanId: profissionalPlan.id,
                    startDate: new Date(),
                    trialEndDate,
                    status: SubscriptionStatus.TRIAL,
                });
            }

            const existingSubscriptions = await tenantSubscriptionRepository.find({
                where: { status: SubscriptionStatus.TRIAL },
            });

            if (existingSubscriptions.length === 0) {
                await tenantSubscriptionRepository.insert(trialSubscriptions);
                console.log(`✅ Created ${trialSubscriptions.length} trial subscriptions`);
            } else {
                console.log(`ℹ️ Trial subscriptions already exist, skipping creation`);
            }
        }
    }
}
