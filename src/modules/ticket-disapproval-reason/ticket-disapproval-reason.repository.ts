import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketDisapprovalReason } from './entities/ticket-disapproval-reason.entity';

@Injectable()
export class TicketDisapprovalReasonRepository extends Repository<TicketDisapprovalReason> {
    constructor(private dataSource: DataSource) {
        super(TicketDisapprovalReason, dataSource.createEntityManager());
    }
}
