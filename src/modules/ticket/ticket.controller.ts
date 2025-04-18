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
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { GetUser } from '../../shared/decorators/get-user.decorator';
import { QueryOptions } from '../../shared/types/http';
import { User } from '../user/entities/user.entity';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { UpdateTicketDto } from './dtos/update-ticket.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketService } from './ticket.service';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @Post()
    create(@Body() createTicketDto: CreateTicketDto, @GetUser() user: User) {
        return this.ticketService.create(user, createTicketDto);
    }

    @Get()
    findMany(@GetUser() user: User, @GetQueryOptions() options: QueryOptions<Ticket>) {
        return this.ticketService.findMany(user, options);
    }

    @Get(':id')
    findById(@Param('id') customId: string, @GetUser() user: User) {
        return this.ticketService.findById(user, customId);
    }

    @Get('department/:departmentId')
    findByDepartment(
        @Param('departmentId', ParseIntPipe) departmentId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetUser() user: User,
    ) {
        options.where = { ...options.where, departmentId, isPrivate: false };

        return this.ticketService.findBy(user, options);
    }

    @Get('requester/:requesterId')
    findByRequester(
        @Param('requesterId', ParseIntPipe) requesterId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetUser() user: User,
    ) {
        options.where.requesterId = requesterId;

        return this.ticketService.findBy(user, options);
    }

    @Get('target-user/:userId')
    findByTargetUser(
        @Param('userId', ParseIntPipe) userId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetUser() user: User,
    ) {
        options.where.targetUserId = userId;
        return this.ticketService.findBy(user, options);
    }

    @Patch(':id')
    update(
        @Param('id') customId: string,
        @Body() updateTicketDto: UpdateTicketDto,
        @GetUser() user: User,
    ) {
        return this.ticketService.updateTicket(user, customId, updateTicketDto);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') customId: string,
        @Body() updateTicketStatusDto: UpdateTicketStatusDto,
        @GetUser() user: User,
    ) {
        return this.ticketService.updateStatus(user, customId, updateTicketStatusDto);
    }

    @Post(':id/accept')
    accept(@Param('id') customId: string, @GetUser() user: User) {
        return this.ticketService.accept(user, customId);
    }

    @Post(':id/approve')
    approve(@Param('id') customId: string, @GetUser() user: User) {
        return this.ticketService.approve(user, customId);
    }

    @Post(':id/cancel')
    cancel(@Param('id') customId: string, @GetUser() user: User) {
        return this.ticketService.cancel(user, customId);
    }

    @Delete(':id')
    delete(@Param('id') customId: string, @GetUser() user: User) {
        return this.ticketService.deleteTicket(user, customId);
    }
}
