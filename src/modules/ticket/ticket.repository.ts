import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketRepository extends Repository<Ticket> {
    constructor(private dataSource: DataSource) {
        super(Ticket, dataSource.createEntityManager());
    }
}
