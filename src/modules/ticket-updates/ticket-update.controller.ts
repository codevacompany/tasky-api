import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { TicketUpdateService } from './ticket-update.service';

@Controller('ticket-updates')
@UseGuards(AuthGuard('jwt'))
export class TicketUpdateController {
    constructor(private readonly ticketUpdateService: TicketUpdateService) {}

    /**
     * Get a lightweight change checksum for efficient polling.
     * Returns count and latest update timestamp.
     * Frontend uses this to detect if any tickets have changed before fetching full data.
     */
    @Get('change-checksum')
    async getChangeChecksum(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketUpdateService.getChangeChecksum(accessProfile);
    }

    @Get('ticket/:ticketId')
    async findByTicketId(
        @Param('ticketId') ticketCustomId: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        // Add tenant checks if needed inside service
        return this.ticketUpdateService.findByTicketId(accessProfile, ticketCustomId);
    }
}
