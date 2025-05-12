import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { TicketDisapprovalReasonRepository } from './ticket-disapproval-reason.repository';
import { TicketDisapprovalReasonService } from './ticket-disapproval-reason.service';

@Module({
    imports: [UserModule],
    providers: [TicketDisapprovalReasonRepository, TicketDisapprovalReasonService],
    exports: [TicketDisapprovalReasonRepository, TicketDisapprovalReasonService],
})
export class TicketDisapprovalReasonModule {}
