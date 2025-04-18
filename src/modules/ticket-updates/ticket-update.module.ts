import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketUpdate } from './entities/ticket-update.entity';
import { TicketUpdateRepository } from './ticket-update.repository';
import { TicketUpdateService } from './ticket-update.service';
import { TicketUpdateController } from './ticket-update.controller';

@Module({
    imports: [TypeOrmModule.forFeature([TicketUpdate])],
    exports: [TicketUpdateService, TicketUpdateRepository],
    controllers: [TicketUpdateController],
    providers: [TicketUpdateService, TicketUpdateRepository],
})
export class TicketUpdateModule {}
