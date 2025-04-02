import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCommentController } from './ticket-comment.controller';
import { TicketCommentRepository } from './ticket-comment.repository';
import { TicketCommentService } from './ticket-comment.service';

@Module({
    imports: [TypeOrmModule.forFeature([TicketComment])],
    exports: [TicketCommentService],
    controllers: [TicketCommentController],
    providers: [TicketCommentService, TicketCommentRepository],
})
export class TicketCommentModule {}
