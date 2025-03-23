import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketController } from './ticket.controller';
import { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';

@Module({
    imports: [TypeOrmModule.forFeature([Ticket])],
    exports: [TicketService],
    controllers: [TicketController],
    providers: [TicketService, TicketRepository],
})
export class TicketModule {}
