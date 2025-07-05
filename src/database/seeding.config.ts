import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load environment variables
config();

const configService = new ConfigService();

export const seedingDataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    url: configService.get('POSTGRES_URL'),
    entities: ['src/**/*.entity{.ts,.js}'],
    migrations: ['src/database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: configService.get('DB_LOG') === 'true',
};

export const seedingDataSource = new DataSource(seedingDataSourceOptions);
