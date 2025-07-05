#!/usr/bin/env ts-node

import { seedingDataSource } from '../seeding.config';
import { useDataSource, useSeeders } from '@jorgebodega/typeorm-seeding';
import MainSeeder from '../seeds/main.seeder';

async function runSeeding() {
    console.log('🌱 Initializing database seeding...');

    try {
        // Initialize the data source
        await seedingDataSource.initialize();
        console.log('📊 Database connection established');

        // Set up the seeding library
        await useDataSource(seedingDataSource);

        // Run all seeders
        console.log('🌱 Running all seeders...');
        await useSeeders([MainSeeder]);

        console.log('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        if (seedingDataSource.isInitialized) {
            await seedingDataSource.destroy();
        }
    }
}

// Run the seeding
runSeeding();
