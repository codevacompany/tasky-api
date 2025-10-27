import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TicketTargetUser } from './entities/ticket-target-user.entity';

@Injectable()
export class TicketTargetUserRepository extends Repository<TicketTargetUser> {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {
        super(TicketTargetUser, dataSource.createEntityManager());
    }
}
