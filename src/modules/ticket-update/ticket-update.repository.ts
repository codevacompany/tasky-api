import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketUpdate } from './entities/ticket-update.entity';

@Injectable()
export class TicketUpdateRepository extends Repository<TicketUpdate> {
    constructor(private dataSource: DataSource) {
        super(TicketUpdate, dataSource.createEntityManager());
    }
}
