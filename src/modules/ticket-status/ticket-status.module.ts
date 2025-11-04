import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketStatus } from './entities/ticket-status.entity';
import { TicketStatusInitService } from './ticket-status-init.service';
import { StatusColumnModule } from '../status-column/status-column.module';

@Module({
    imports: [TypeOrmModule.forFeature([TicketStatus]), StatusColumnModule],
    providers: [TicketStatusInitService],
    exports: [TicketStatusInitService, TypeOrmModule],
})
export class TicketStatusModule {}
