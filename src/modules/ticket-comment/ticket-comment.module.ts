import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCommentController } from './ticket-comment.controller';
import { TicketCommentRepository } from './ticket-comment.repository';
import { TicketCommentService } from './ticket-comment.service';

@Module({
    imports: [TypeOrmModule.forFeature([TicketComment]), NotificationModule, UserModule],
    exports: [TicketCommentService],
    controllers: [TicketCommentController],
    providers: [TicketCommentService, TicketCommentRepository],
})
export class TicketCommentModule {}
