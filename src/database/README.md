# Database Seeding System

This project uses a structured, scalable database seeding system built with `@jorgebodega/typeorm-seeding`. This system replaces the previous migration-based seeding approach with a more maintainable and flexible solution.

## 🌟 Features

-   **Modular Architecture**: Each entity type has its own seeder class
-   **Dependency Management**: Seeders run in the correct order based on relationships
-   **CLI Support**: Run seeders from command line or within the application
-   **Environment Safety**: Production safeguards prevent accidental data loss
-   **Flexible Execution**: Run all seeders or specific ones as needed
-   **Rich Logging**: Clear feedback on seeding progress and results

## 📁 Structure

```
src/database/
├── seeds/
│   ├── main.seeder.ts              # Orchestrates all seeders
│   ├── permission.seeder.ts        # Creates permissions
│   ├── subscription-plan.seeder.ts # Creates plans and plan-permission mappings
│   ├── tenant.seeder.ts           # Creates sample tenants
│   └── user.seeder.ts             # Creates roles, departments, and users
├── cli/
│   └── seed.ts                    # CLI script for running seeders
├── database-seeder.service.ts     # NestJS service for application use
├── seeding.config.ts              # Database configuration for seeding
└── README.md                      # This documentation
```

## 🚀 Usage

### Command Line Interface

Run all seeders in the correct order:

```bash
npm run seed:all
```

Run specific seeders:

```bash
npm run seed:permissions    # Only permissions
npm run seed:plans         # Only subscription plans
npm run seed:tenants       # Only tenants
npm run seed:users         # Only users (includes roles & departments)
```

Multiple specific seeders:

```bash
npm run seed permissions tenants users
```

### Within NestJS Application

Inject the `DatabaseSeederService` into your modules:

```typescript
import { DatabaseSeederService } from './database/database-seeder.service';

@Controller('admin')
export class AdminController {
    constructor(private readonly seederService: DatabaseSeederService) {}

    @Post('seed')
    async seedDatabase() {
        await this.seederService.seedAll();
        return { message: 'Database seeded successfully' };
    }

    @Post('seed/:type')
    async seedSpecific(@Param('type') type: string) {
        await this.seederService.seedSpecific([type]);
        return { message: `${type} seeded successfully` };
    }
}
```

### Auto-seeding on Application Start

You can automatically seed the database on application startup:

```typescript
// In your main.ts or app module
import { DatabaseSeederService } from './database/database-seeder.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Check if database needs seeding
    const seederService = app.get(DatabaseSeederService);
    const needsSeeding = await seederService.needsSeeding();

    if (needsSeeding) {
        console.log('Database appears empty, running seeders...');
        await seederService.seedAll();
    }

    await app.listen(3000);
}
```

## 📊 Seeder Details

### PermissionSeeder

-   Creates all system permissions
-   Includes user management, analytics, notifications, departments, tickets, integrations, and support permissions
-   **Dependencies**: None

### SubscriptionPlanSeeder

-   Creates subscription plans: Básico, Essencial, Avançado, Usuários Adicionais
-   Maps permissions to each plan based on plan capabilities
-   **Dependencies**: PermissionSeeder

### TenantSeeder

-   Creates sample tenants for development and testing
-   Includes internal Tasky tenant and external demo companies
-   **Dependencies**: None

### UserSeeder

-   Creates roles (Global Admin, Tenant Admin, User)
-   Creates departments for each tenant (Administrativo, Desenvolvimento, Suporte, Comercial)
-   Creates users with proper tenant, role, and department assignments
-   **Dependencies**: TenantSeeder

## 🛡️ Safety Features

### Environment Protection

-   Reseeding operations are blocked in production environment
-   Clear warnings when destructive operations are performed

### Data Validation

-   Each seeder checks for existing data to prevent duplicates
-   Proper error handling with detailed logging
-   Transactional operations ensure data consistency

### Dependency Management

-   Seeders run in the correct order automatically
-   Clear error messages if dependencies are missing

## 🔧 Configuration

### Database Connection

The seeding system uses the same database configuration as your main application, defined in `seeding.config.ts`:

```typescript
export const seedingDataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: configService.get('DB_LOG') === 'true',
};
```

### Environment Variables

Ensure these variables are set in your `.env` file:

-   `DB_HOST`
-   `DB_PORT`
-   `DB_USERNAME`
-   `DB_PASSWORD`
-   `DB_DATABASE`
-   `DB_LOG` (optional, for query logging)

## 📝 Creating New Seeders

1. Create a new seeder class extending `Seeder`:

```typescript
import { DataSource } from 'typeorm';
import { Seeder } from '@jorgebodega/typeorm-seeding';
import { YourEntity } from '../../modules/your-module/entities/your-entity.entity';

export class YourEntitySeeder extends Seeder {
    async run(dataSource: DataSource): Promise<void> {
        console.log('🔄 Seeding your entities...');

        const repository = dataSource.getRepository(YourEntity);

        // Clear existing data (for development)
        await repository.clear();

        // Create your seed data
        const entities = [
            { name: 'Example 1', description: 'First example' },
            { name: 'Example 2', description: 'Second example' },
        ];

        for (const entityData of entities) {
            await repository.save(repository.create(entityData));
        }

        console.log(`✅ Created ${entities.length} your entities`);
    }
}
```

2. Add it to the main seeder:

```typescript
// In main.seeder.ts
import { YourEntitySeeder } from './your-entity.seeder';

export default class MainSeeder extends Seeder {
    async run(dataSource: DataSource): Promise<void> {
        // ... existing seeders
        await new YourEntitySeeder().run(dataSource);
    }
}
```

3. Add CLI support:

```typescript
// In cli/seed.ts and database-seeder.service.ts
case 'your-entities':
  const { YourEntitySeeder } = await import('../seeds/your-entity.seeder');
  seederClasses.push(YourEntitySeeder);
  break;
```

4. Add package.json script:

```json
{
    "scripts": {
        "seed:your-entities": "npm run seed your-entities"
    }
}
```

## 🚨 Migration from Old System

If you're migrating from the previous migration-based seeding:

1. **Remove seed migrations**: Delete any migration files that only insert seed data
2. **Update initialization**: Replace migration-based seeding with the new service
3. **Test thoroughly**: Ensure all data is correctly seeded with the new system

## 📚 Sample Data

The seeding system creates the following sample data:

### Default Users

-   **Global Admin**: `admin@tasky.com.br` (password: 123456)
-   **Tenant Admins**: `admin@{tenant-key}.com.br` (password: 123456)
-   **Regular Users**: Various users across different departments (password: 123456)

### Tenants

-   Tasky Sistemas Internos (internal)
-   Empresa Demo LTDA
-   StartupTech Inovação

### Subscription Plans

-   Plano Básico (R$ 99/mês, 5 users)
-   Plano Essencial (R$ 199/mês, 15 users)
-   Plano Avançado (R$ 399/mês, 30 users)
-   Usuários Adicionais (R$ 15/mês per user)

All sample users use the password `123456` for development convenience.

## 🤝 Contributing

When adding new seeders:

1. Follow the existing naming conventions
2. Include proper error handling and logging
3. Add CLI support for standalone execution
4. Update this documentation
5. Test both individual and full seeding scenarios
