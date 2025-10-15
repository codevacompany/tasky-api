import { DataSource } from 'typeorm';
import { Seeder } from '@jorgebodega/typeorm-seeding';
import { PermissionSeeder } from './permission.seeder';
import { SubscriptionPlanSeeder } from './subscription-plan.seeder';
import { TenantSeeder } from './tenant.seeder';
import { UserSeeder } from './user.seeder';

export default class MainSeeder extends Seeder {
    async run(dataSource: DataSource): Promise<void> {
        console.log('🌱 Starting database seeding...');

        // Execute seeders in dependency order
        await new PermissionSeeder().run(dataSource);
        await new SubscriptionPlanSeeder().run(dataSource);

        if (process.env.APP_ENV === 'production') {
            console.log('🚫 Production environment detected: skipping Tenant and User seeders.');
        } else {
            await new TenantSeeder().run(dataSource);
            await new UserSeeder().run(dataSource);
        }

        console.log('✅ Database seeding completed successfully!');
    }
}
