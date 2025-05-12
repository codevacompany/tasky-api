import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { TicketCancellationReasonRepository } from './ticket-cancellation-reason.repository';
import { TicketCancellationReasonService } from './ticket-cancellation-reason.service';

@Module({
    imports: [UserModule],
    providers: [TicketCancellationReasonRepository, TicketCancellationReasonService],
    exports: [TicketCancellationReasonRepository, TicketCancellationReasonService],
})
export class TicketCancellationReasonModule {}
