import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { useDataSource, useSeeders } from '@jorgebodega/typeorm-seeding';
import MainSeeder from './seeds/main.seeder';

@Injectable()
export class DatabaseSeederService {
    private readonly logger = new Logger(DatabaseSeederService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    /**
     * Seeds the database with all necessary data
     */
    async seedAll(): Promise<void> {
        try {
            this.logger.log('🌱 Starting database seeding process...');

            // Use the existing data source for seeding
            await useDataSource(this.dataSource);

            // Run the main seeder
            await useSeeders([MainSeeder]);

            this.logger.log('✅ Database seeding completed successfully!');
        } catch (error) {
            this.logger.error('❌ Database seeding failed:', error);
            throw error;
        }
    }

    /**
     * Checks if the database needs seeding (empty or minimal data)
     */
    async needsSeeding(): Promise<boolean> {
        try {
            const [permissionCount, planCount, tenantCount, userCount] = await Promise.all([
                this.dataSource.getRepository('Permission').count(),
                this.dataSource.getRepository('SubscriptionPlan').count(),
                this.dataSource.getRepository('Tenant').count(),
                this.dataSource.getRepository('User').count(),
            ]);

            // Consider database needs seeding if any of these core entities are empty
            return permissionCount === 0 || planCount === 0 || tenantCount === 0 || userCount === 0;
        } catch (error) {
            this.logger.error('Error checking if database needs seeding:', error);
            return true; // Assume it needs seeding if we can't check
        }
    }

    /**
     * Development helper: clears and reseeds all data
     */
    async reseedAll(): Promise<void> {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Reseeding is not allowed in production environment');
        }

        this.logger.warn('🔄 Reseeding database (clearing all data)...');
        await this.seedAll();
    }
}
