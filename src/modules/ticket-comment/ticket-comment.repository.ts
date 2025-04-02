import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketComment } from './entities/ticket-comment.entity';

@Injectable()
export class TicketCommentRepository extends Repository<TicketComment> {
    constructor(private dataSource: DataSource) {
        super(TicketComment, dataSource.createEntityManager());
    }
}
