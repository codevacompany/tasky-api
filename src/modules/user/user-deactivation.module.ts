import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { TermsAcceptanceRequiredGuard } from '../../shared/guards/terms-acceptance-required.guard';
import { RoleModule } from '../role/role.module';
import { TenantModule } from '../tenant/tenant.module';
import { TenantSubscriptionModule } from '../tenant-subscription/tenant-subscription.module';
import { TicketModule } from '../ticket/ticket.module';
import { UserDeactivationController } from './user-deactivation.controller';
import { UserDeactivationService } from './user-deactivation.service';
import { UserModule } from './user.module';

@Module({
    imports: [
        UserModule,
        TicketModule,
        RoleModule,
        forwardRef(() => TenantModule),
        forwardRef(() => TenantSubscriptionModule),
    ],
    controllers: [UserDeactivationController],
    providers: [
        UserDeactivationService,
        SubscriptionRequiredGuard,
        TermsAcceptanceRequiredGuard,
    ],
})
export class UserDeactivationModule {}
