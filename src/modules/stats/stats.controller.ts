import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { TicketStatsResponseDto } from './dtos/ticket-stats-response.dto';
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
}
