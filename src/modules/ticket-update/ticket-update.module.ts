import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketUpdate } from './entities/ticket-update.entity';
import { TicketUpdateController } from './ticket-update.controller';
import { TicketUpdateRepository } from './ticket-update.repository';
import { TicketUpdateService } from './ticket-update.service';

@Module({
    imports: [TypeOrmModule.forFeature([TicketUpdate])],
    exports: [TicketUpdateService],
    controllers: [TicketUpdateController],
    providers: [TicketUpdateService, TicketUpdateRepository],
})
export class TicketUpdateModule {}
