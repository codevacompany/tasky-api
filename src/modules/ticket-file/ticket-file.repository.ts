import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketFile } from './entities/ticket-file.entity';

@Injectable()
export class TicketFileRepository extends Repository<TicketFile> {
    constructor(private dataSource: DataSource) {
        super(TicketFile, dataSource.createEntityManager());
    }
}
