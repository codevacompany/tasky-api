import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketController } from './ticket.controller';
import { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [TypeOrmModule.forFeature([Ticket]), NotificationModule, UserModule],
    exports: [TicketService],
    controllers: [TicketController],
    providers: [TicketService, TicketRepository],
})
export class TicketModule {}
