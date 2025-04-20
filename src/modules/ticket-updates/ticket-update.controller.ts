import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { TicketUpdateService } from './ticket-update.service';

@Controller('ticket-updates')
@UseGuards(AuthGuard('jwt'))
export class TicketUpdateController {
    constructor(private readonly ticketUpdateService: TicketUpdateService) {}

    @Get('ticket/:ticketId')
    async findByTicketId(
        @Param('ticketId') ticketCustomId: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        // Add tenant checks if needed inside service
        return this.ticketUpdateService.findByTicketId(accessProfile, ticketCustomId);
    }
}
