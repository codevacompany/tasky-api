import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { CreateChecklistItemDto } from './dtos/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dtos/update-checklist-item.dto';
import { TicketChecklistService } from './ticket-checklist.service';

@UseGuards(AuthGuard('jwt'))
@Controller('ticket-checklists')
export class TicketChecklistController {
    constructor(private readonly checklistService: TicketChecklistService) {}

    @Get('ticket/:ticketId')
    async getByTicket(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('ticketId', ParseIntPipe) ticketId: number,
    ) {
        return this.checklistService.getByTicket(accessProfile, ticketId);
    }

    @Post('items')
    async createItem(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() dto: CreateChecklistItemDto,
    ) {
        return this.checklistService.createItem(accessProfile, dto);
    }

    @Patch('items/:id')
    async updateItem(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateChecklistItemDto,
    ) {
        return this.checklistService.updateItem(accessProfile, id, dto);
    }

    @Delete('items/:id')
    async deleteItem(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.checklistService.deleteItem(accessProfile, id);
        return { message: 'Checklist item deleted successfully' };
    }
}

