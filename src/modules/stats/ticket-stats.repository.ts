import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketStats } from './entities/ticket-stats.entity';

@Injectable()
export class TicketStatsRepository extends Repository<TicketStats> {
    constructor(private dataSource: DataSource) {
        super(TicketStats, dataSource.createEntityManager());
    }
}
