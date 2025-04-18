import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../shared/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { TicketUpdateService } from './ticket-update.service';

@Controller('ticket-updates')
@UseGuards(AuthGuard('jwt'))
export class TicketUpdateController {
    constructor(private readonly ticketUpdateService: TicketUpdateService) {}

    @Get('ticket/:ticketId')
    async findByTicketId(@Param('ticketId') ticketCustomId: string, @GetUser() user: User) {
        // Add tenant checks if needed inside service
        return this.ticketUpdateService.findByTicketId(user, ticketCustomId);
    }
}
