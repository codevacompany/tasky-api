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
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { CreateChecklistItemDto } from './dtos/create-checklist-item.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { UpdateChecklistItemDto } from './dtos/update-checklist-item.dto';
import { TicketChecklistService } from './ticket-checklist.service';

@UseGuards(AuthGuard('jwt'))
@Controller('ticket-checklists')
export class TicketChecklistController {
    constructor(private readonly checklistService: TicketChecklistService) {}

    @Post()
    async create(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() dto: CreateChecklistDto,
    ) {
        return this.checklistService.create(accessProfile, dto);
    }

    @Get('ticket/:ticketId')
    async getByTicket(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('ticketId', ParseIntPipe) ticketId: number,
    ) {
        return this.checklistService.getByTicket(accessProfile, ticketId);
    }

    @Patch(':id')
    async update(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateChecklistDto,
    ) {
        return this.checklistService.updateChecklist(accessProfile, id, dto);
    }

    @Delete(':id')
    async delete(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.checklistService.delete(accessProfile, id);
        return { message: 'Checklist deleted successfully' };
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

