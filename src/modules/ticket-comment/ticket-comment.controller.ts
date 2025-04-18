import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateTicketCommentDto } from './dtos/create-ticket-comment.dto';
import { UpdateTicketCommentDto } from './dtos/update-ticket-comment.dto';
import { TicketCommentService } from './ticket-comment.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../../shared/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { TicketComment } from './entities/ticket-comment.entity';

@Controller('ticket-comments')
@UseGuards(AuthGuard('jwt'))
export class TicketCommentController {
    constructor(private readonly ticketCommentService: TicketCommentService) {}

    @Get()
    async findAll(@GetUser() user: User) {
        return this.ticketCommentService.findAll(user);
    }

    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
        return this.ticketCommentService.findById(user, id);
    }

    @Get('ticket/:ticketId')
    findByTicket(
        @Param('ticketId') ticketCustomId: string,
        @GetUser() user: User,
        @GetQueryOptions() options?: QueryOptions<TicketComment>
    ) {
        return this.ticketCommentService.findBy(user, { ticketCustomId }, options);
    }

    @Post()
    async create(
        @Body() createTicketCommentDto: CreateTicketCommentDto,
        @GetUser() user: User
    ) {
        return this.ticketCommentService.create(user, createTicketCommentDto);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTicketCommentDto: UpdateTicketCommentDto,
        @GetUser() user: User
    ) {
        return this.ticketCommentService.update(user, id, updateTicketCommentDto);
    }

    @Delete(':id')
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: User
    ) {
        return this.ticketCommentService.delete(user, id);
    }
}
