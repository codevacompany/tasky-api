import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketModule } from '../ticket/ticket.module';
import { TicketChecklistController } from './ticket-checklist.controller';
import { TicketChecklistItem } from './entities/ticket-checklist-item.entity';
import { TicketChecklistService } from './ticket-checklist.service';

@Module({
    imports: [TypeOrmModule.forFeature([TicketChecklistItem]), TicketModule],
    exports: [TicketChecklistService],
    controllers: [TicketChecklistController],
    providers: [TicketChecklistService],
})
export class TicketChecklistModule {}
