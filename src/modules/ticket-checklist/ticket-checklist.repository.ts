import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketChecklist } from './entities/ticket-checklist.entity';

@Injectable()
export class TicketChecklistRepository extends Repository<TicketChecklist> {
    constructor(private dataSource: DataSource) {
        super(TicketChecklist, dataSource.createEntityManager());
    }
}
