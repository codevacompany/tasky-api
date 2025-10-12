import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentModule } from '../department/department.module';
import { TicketUpdate } from '../ticket-updates/entities/ticket-update.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { User } from '../user/entities/user.entity';
import { BusinessHoursService } from '../../shared/services/business-hours.service';
import { TicketStats } from './entities/ticket-stats.entity';
import { StatsController } from './stats.controller';
import { TicketStatsService } from './ticket-stats.service';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TicketStats, Ticket, TicketUpdate, User]),
        DepartmentModule,
        UserModule,
    ],
    providers: [TicketStatsService, BusinessHoursService],
    controllers: [StatsController],
    exports: [TicketStatsService],
})
export class StatsModule {}
