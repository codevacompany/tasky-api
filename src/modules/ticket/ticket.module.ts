import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../../shared/services/email/email.module';
import { CorrectionRequestModule } from '../correction-request-reason/correction-request-reason.module';
import { NotificationModule } from '../notification/notification.module';
import { StatsModule } from '../stats/stats.module';
import { TenantModule } from '../tenant/tenant.module';
import { TenantSubscriptionModule } from '../tenant-subscription/tenant-subscription.module';
import { TicketCancellationReasonModule } from '../ticket-cancellation-reason/ticket-cancellation-reason.module';
import { TicketDisapprovalReasonModule } from '../ticket-disapproval-reason/ticket-disapproval-reason.module';
import { TicketFileModule } from '../ticket-file/ticket-file.module';
import { TicketUpdateModule } from '../ticket-updates/ticket-update.module';
import { UserModule } from '../user/user.module';
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
    ],
    exports: [TicketService],
    controllers: [TicketController],
    providers: [TicketService, TicketRepository],
})
export class TicketModule {}
