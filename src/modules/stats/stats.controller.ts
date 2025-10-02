import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { ResolutionTimeResponseDto } from './dtos/resolution-time.dto';
import {
    StatusDurationResponseDto,
    StatusDurationTimeSeriesResponseDto,
} from './dtos/status-duration.dto';
import { TicketPriorityCountResponseDto } from './dtos/ticket-priority-count.dto';
import { DepartmentStatsDto, TicketStatsResponseDto } from './dtos/ticket-stats-response.dto';
import { TicketStatusCountResponseDto } from './dtos/ticket-status-count.dto';
import { TicketTrendsResponseDto } from './dtos/ticket-trends.dto';
import { UserRankingResponseDto } from './dtos/user-ranking.dto';
import { TicketStatsService } from './ticket-stats.service';
import { TicketStatus } from '../ticket/entities/ticket.entity';

export enum StatsPeriod {
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    TRIMESTRAL = 'trimestral',
    SEMESTRAL = 'semestral',
    ANNUAL = 'annual',
    ALL = 'all',
}

@Controller('stats')
@UseGuards(AuthGuard('jwt'))
export class StatsController {
    constructor(private readonly ticketStatsService: TicketStatsService) {}

    //TODO: Add global admin guard if needed
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

    @Get('department-stats')
    async getDepartmentStats(
        @GetAccessProfile() profile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<DepartmentStatsDto[]> {
        return this.ticketStatsService.getDepartmentStats(profile, period);
    }

    @Get('resolution-time')
    async getResolutionTimeData(
        @GetAccessProfile() profile: AccessProfile,
    ): Promise<ResolutionTimeResponseDto> {
        return this.ticketStatsService.getResolutionTimeData(profile);
    }

    @Get('status-duration-time-series')
    async getStatusDurationTimeSeries(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('status') status: TicketStatus,
    ): Promise<StatusDurationTimeSeriesResponseDto> {
        return this.ticketStatsService.getStatusDurationTimeSeries(accessProfile, status);
    }

    @Get('top-users')
    async getTopUsers(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('limit') limit: number = 5,
        @Query('all') all?: string,
        @Query('sort') sort: string = 'top',
    ): Promise<UserRankingResponseDto> {
        const returnAll = all === 'true' || all === '1';
        return this.ticketStatsService.getUserRanking(accessProfile, limit, returnAll, sort);
    }
}
