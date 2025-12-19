import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentModule } from '../department/department.module';
import { TicketUpdate } from '../ticket-updates/entities/ticket-update.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { User } from '../user/entities/user.entity';
import { BusinessHoursService } from '../../shared/services/business-hours.service';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { TermsAcceptanceRequiredGuard } from '../../shared/guards/terms-acceptance-required.guard';
import { TicketStats } from './entities/ticket-stats.entity';
import { StatsController } from './stats.controller';
import { TicketStatsService } from './ticket-stats.service';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';
import { TenantModule } from '../tenant/tenant.module';
import { TenantSubscriptionModule } from '../tenant-subscription/tenant-subscription.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TicketStats, Ticket, TicketUpdate, User]),
        DepartmentModule,
        UserModule,
        RoleModule,
        forwardRef(() => TenantModule),
        forwardRef(() => TenantSubscriptionModule),
    ],
    providers: [
        TicketStatsService,
        BusinessHoursService,
        SubscriptionRequiredGuard,
        TermsAcceptanceRequiredGuard,
    ],
    controllers: [StatsController],
    exports: [TicketStatsService],
})
export class StatsModule {}
