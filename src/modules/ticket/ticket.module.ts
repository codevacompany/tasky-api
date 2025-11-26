import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../../shared/services/email/email.module';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { CorrectionRequestModule } from '../correction-request-reason/correction-request-reason.module';
import { NotificationModule } from '../notification/notification.module';
import { StatsModule } from '../stats/stats.module';
import { TenantModule } from '../tenant/tenant.module';
import { TenantSubscriptionModule } from '../tenant-subscription/tenant-subscription.module';
import { TicketCancellationReasonModule } from '../ticket-cancellation-reason/ticket-cancellation-reason.module';
import { TicketDisapprovalReasonModule } from '../ticket-disapproval-reason/ticket-disapproval-reason.module';
import { TicketFileModule } from '../ticket-file/ticket-file.module';
import { TicketTargetUserModule } from '../ticket-target-user/ticket-target-user.module';
import { RoleModule } from '../role/role.module';
import { TicketTargetUserRepository } from '../ticket-target-user/ticket-target-user.repository';
import { TicketUpdateModule } from '../ticket-updates/ticket-update.module';
import { UserModule } from '../user/user.module';
import { StatusActionModule } from '../status-action/status-action.module';
import { TicketStatusModule } from '../ticket-status/ticket-status.module';
import { Ticket } from './entities/ticket.entity';
import { TicketController } from './ticket.controller';
import { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Ticket]),
        NotificationModule,
        UserModule,
        forwardRef(() => TicketUpdateModule),
        TenantModule,
        TenantSubscriptionModule,
        TicketFileModule,
        TicketCancellationReasonModule,
        TicketDisapprovalReasonModule,
        CorrectionRequestModule,
        EmailModule,
        StatsModule,
        TicketTargetUserModule,
        RoleModule,
        StatusActionModule,
        TicketStatusModule,
    ],
    exports: [TicketService],
    controllers: [TicketController],
    providers: [TicketService, TicketRepository, TicketTargetUserRepository, SubscriptionRequiredGuard],
})
export class TicketModule {}
