import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from '../role/role.module';
import { TenantModule } from '../tenant/tenant.module';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionService } from './subscription.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Subscription]),
        TenantModule,
        RoleModule, // Required for GlobalAdminGuard
    ],
    controllers: [SubscriptionController],
    providers: [SubscriptionService, SubscriptionRepository],
    exports: [SubscriptionService],
})
export class SubscriptionModule {}
