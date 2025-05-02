import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { TicketPriorityCountResponseDto } from './dtos/ticket-priority-count.dto';
import { TicketStatsResponseDto } from './dtos/ticket-stats-response.dto';
import { TicketStatusCountResponseDto } from './dtos/ticket-status-count.dto';
import { TicketTrendsResponseDto } from './dtos/ticket-trends.dto';
import { TicketStatsService } from './ticket-stats.service';

@Controller('stats')
@UseGuards(AuthGuard('jwt'))
export class StatsController {
    constructor(private readonly ticketStatsService: TicketStatsService) {}

    @Get()
    async getTicketStats(
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<TicketStatsResponseDto> {
        return this.ticketStatsService.getTenantStats(accessProfile);
    }

    @Get('ticket-trends')
    async getTicketTrends(
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<TicketTrendsResponseDto> {
        return this.ticketStatsService.getTicketTrends(accessProfile);
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
