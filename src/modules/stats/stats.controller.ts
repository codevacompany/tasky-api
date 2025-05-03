import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { StatusDurationResponseDto } from './dtos/status-duration.dto';
import { TicketPriorityCountResponseDto } from './dtos/ticket-priority-count.dto';
import { TicketStatsResponseDto } from './dtos/ticket-stats-response.dto';
import { TicketStatusCountResponseDto } from './dtos/ticket-status-count.dto';
import { TicketTrendsResponseDto } from './dtos/ticket-trends.dto';
import { TicketStatsService } from './ticket-stats.service';

export enum StatsPeriod {
    ANNUAL = 'annual',
    SEMESTRAL = 'semestral',
    TRIMESTRAL = 'trimestral',
    MONTHLY = 'monthly',
    WEEKLY = 'weekly',
    ALL = 'all',
}

@Controller('stats')
@UseGuards(AuthGuard('jwt'))
export class StatsController {
    constructor(private readonly ticketStatsService: TicketStatsService) {}

    @Get('/by-tenant')
    async getTenantStats(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<TicketStatsResponseDto> {
        return this.ticketStatsService.getTenantStats(accessProfile, period);
    }

    @Get('/by-user')
    async getUserStats(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<TicketStatsResponseDto> {
        return this.ticketStatsService.getUserStats(accessProfile, accessProfile.userId, period);
    }

    @Get('ticket-trends')
    async getTicketTrends(
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<TicketTrendsResponseDto> {
        return this.ticketStatsService.getTicketTrends(accessProfile);
    }

    @Get('status-durations')
    async getStatusDurations(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<StatusDurationResponseDto> {
        return this.ticketStatsService.getStatusDurations(accessProfile, period);
    }

    @Get('by-status')
    async getTicketStatusCounts(
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<TicketStatusCountResponseDto> {
        return this.ticketStatsService.getTicketsByStatus(accessProfile);
    }

    @Get('by-priority')
    async getTicketPriorityCounts(
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<TicketPriorityCountResponseDto> {
        return this.ticketStatsService.getTicketsByPriority(accessProfile);
    }
}
