import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentModule } from '../department/department.module';
import { TicketStats } from './entities/ticket-stats.entity';
import { StatsController } from './stats.controller';
import { TicketStatsRepository } from './ticket-stats.repository';
import { TicketStatsService } from './ticket-stats.service';

@Module({
    imports: [TypeOrmModule.forFeature([TicketStats]), DepartmentModule],
    providers: [TicketStatsService, TicketStatsRepository],
    controllers: [StatsController],
    exports: [TicketStatsService],
})
export class StatsModule {}
