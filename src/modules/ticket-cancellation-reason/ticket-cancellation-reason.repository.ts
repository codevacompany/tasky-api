import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketCancellationReason } from './entities/ticket-cancellation-reason.entity';

@Injectable()
export class TicketCancellationReasonRepository extends Repository<TicketCancellationReason> {
    constructor(private dataSource: DataSource) {
        super(TicketCancellationReason, dataSource.createEntityManager());
    }
}
