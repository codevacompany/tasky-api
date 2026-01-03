import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { TermsAcceptanceRequiredGuard } from '../../shared/guards/terms-acceptance-required.guard';
import { PaginatedResponse } from '../../shared/types/http';
import { ResolutionTimeResponseDto } from './dtos/resolution-time.dto';
import {
    StatusDurationResponseDto,
    StatusDurationTimeSeriesResponseDto,
} from './dtos/status-duration.dto';
import { TicketPriorityCountResponseDto } from './dtos/ticket-priority-count.dto';
import { DepartmentStatsDto, TicketStatsResponseDto } from './dtos/ticket-stats-response.dto';
import { TicketStatusCountResponseDto } from './dtos/ticket-status-count.dto';
import { TicketTrendsResponseDto } from './dtos/ticket-trends.dto';
import { UserRankingResponseDto, UserRankingItemDto } from './dtos/user-ranking.dto';
import { PerformanceTrendsResponseDto } from './dtos/performance-trends.dto';
import { TicketStatsService } from './ticket-stats.service';
import { TicketStatus } from '../ticket/entities/ticket.entity';
import { CategoryCountResponseDto } from './dtos/category-count.dto';

export enum StatsPeriod {
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    TRIMESTRAL = 'trimestral',
    SEMESTRAL = 'semestral',
    ANNUAL = 'annual',
    ALL = 'all',
}

@Controller('stats')
@UseGuards(AuthGuard('jwt'), SubscriptionRequiredGuard, TermsAcceptanceRequiredGuard)
export class StatsController {
    constructor(private readonly ticketStatsService: TicketStatsService) {}

    //TODO: Add global admin guard if needed
    @Get('/by-tenant')
    async getTenantStats(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
        @Query('excludeCanceled') excludeCanceled?: string,
    ): Promise<TicketStatsResponseDto> {
        const shouldExcludeCanceled = excludeCanceled === 'true' || excludeCanceled === '1';
        return this.ticketStatsService.getTenantStats(accessProfile, period, shouldExcludeCanceled);
    }

    @Get('/by-user')
    async getUserStats(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.TRIMESTRAL,
    ): Promise<TicketStatsResponseDto> {
        return this.ticketStatsService.getUserStats(accessProfile, accessProfile.userId, period);
    }

    @Get('ticket-trends')
    async getTicketTrends(
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<TicketTrendsResponseDto> {
        return this.ticketStatsService.getTicketTrends(accessProfile);
    }

    @Get('performance-trends')
    async getPerformanceTrends(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.TRIMESTRAL,
    ): Promise<PerformanceTrendsResponseDto> {
        return this.ticketStatsService.getPerformanceTrends(accessProfile, period);
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
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<TicketStatusCountResponseDto> {
        return this.ticketStatsService.getTicketsByStatus(accessProfile, period);
    }

    @Get('by-priority')
    async getTicketPriorityCounts(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<TicketPriorityCountResponseDto> {
        return this.ticketStatsService.getTicketsByPriority(accessProfile, period);
    }

    @Get('by-category')
    async getTopCategoriesByTicketCount(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<CategoryCountResponseDto> {
        return this.ticketStatsService.getTopCategoriesByTicketCount(accessProfile, period);
    }

    @Get('department-stats')
    async getDepartmentStats(
        @GetAccessProfile() profile: AccessProfile,
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
        @Query('sortBy') sortBy: string = 'efficiency',
    ): Promise<DepartmentStatsDto[]> {
        return this.ticketStatsService.getDepartmentStats(profile, period, sortBy);
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
        @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
    ): Promise<StatusDurationTimeSeriesResponseDto> {
        return this.ticketStatsService.getStatusDurationTimeSeries(accessProfile, status, period);
    }

    @Get('top-users')
    async getTopUsers(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('limit') limit: number = 5,
        @Query('all') all?: string,
        @Query('sort') sort: string = 'top',
        @Query('sortBy') sortBy: string = 'efficiency',
        @Query('period') period: StatsPeriod = StatsPeriod.TRIMESTRAL,
        @Query('excludeUnscored') excludeUnscoredParam?: string,
    ): Promise<UserRankingResponseDto> {
        const returnAll = all === 'true' || all === '1';
        const excludeUnscored = excludeUnscoredParam === 'true' || excludeUnscoredParam === '1';
        return this.ticketStatsService.getUserRanking(
            accessProfile,
            limit,
            returnAll,
            sort,
            period,
            sortBy,
            excludeUnscored,
        );
    }
    @Get('user-stats-list')
    async getUserStatsList(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('sortBy') sortBy: string = 'efficiency',
        @Query('sortDirection') sortDirection: 'asc' | 'desc' = 'desc',
        @Query('period') period: StatsPeriod = StatsPeriod.TRIMESTRAL,
    ): Promise<PaginatedResponse<UserRankingItemDto>> {
        return this.ticketStatsService.getUserStatsList(
            accessProfile,
            page,
            limit,
            search,
            period,
            sortBy,
            sortDirection,
        );
    }
    @Get('department-stats-list')
    async getDepartmentStatsList(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('sortBy') sortBy: string = 'efficiencyScore',
        @Query('sortDirection') sortDirection: 'asc' | 'desc' = 'desc',
        @Query('period') period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<PaginatedResponse<DepartmentStatsDto>> {
        return this.ticketStatsService.getDepartmentStatsList(
            accessProfile,
            page,
            limit,
            search,
            period,
            sortBy,
            sortDirection,
        );
    }
}
