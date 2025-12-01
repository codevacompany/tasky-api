import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketModule } from '../ticket/ticket.module';
import { TicketChecklistController } from './ticket-checklist.controller';
import { TicketChecklist } from './entities/ticket-checklist.entity';
import { TicketChecklistItem } from './entities/ticket-checklist-item.entity';
import { TicketChecklistRepository } from './ticket-checklist.repository';
import { TicketChecklistService } from './ticket-checklist.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([TicketChecklist, TicketChecklistItem]),
        TicketModule,
    ],
    exports: [TicketChecklistService, TicketChecklistRepository],
    controllers: [TicketChecklistController],
    providers: [TicketChecklistService, TicketChecklistRepository],
})
export class TicketChecklistModule {}

