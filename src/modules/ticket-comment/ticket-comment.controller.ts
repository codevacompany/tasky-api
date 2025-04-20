import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { CreateTicketCommentDto } from './dtos/create-ticket-comment.dto';
import { UpdateTicketCommentDto } from './dtos/update-ticket-comment.dto';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCommentService } from './ticket-comment.service';

@Controller('ticket-comments')
@UseGuards(AuthGuard('jwt'))
export class TicketCommentController {
    constructor(private readonly ticketCommentService: TicketCommentService) {}

    @Get()
    async findAll(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketCommentService.findAll(accessProfile);
    }

    @Get(':id')
    async findById(
        @Param('id', ParseIntPipe) id: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketCommentService.findById(accessProfile, id);
    }

    @Get('ticket/:ticketId')
    findByTicket(
        @Param('ticketId') ticketCustomId: string,
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options?: QueryOptions<TicketComment>,
    ) {
        return this.ticketCommentService.findBy(accessProfile, { ticketCustomId }, options);
    }

    @Post()
    async create(
        @Body() createTicketCommentDto: CreateTicketCommentDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketCommentService.create(accessProfile, createTicketCommentDto);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTicketCommentDto: UpdateTicketCommentDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketCommentService.update(accessProfile, id, updateTicketCommentDto);
    }

    @Delete(':id')
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketCommentService.delete(accessProfile, id);
    }
}
