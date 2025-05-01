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
    create(
        @Body() createTicketDto: CreateTicketDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.create(accessProfile, createTicketDto);
    }

    @Get()
    findMany(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Ticket>,
    ) {
        return this.ticketService.findMany(accessProfile, options);
    }

    @Get(':id')
    findById(@Param('id') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.findById(accessProfile, customId);
    }

    @Get('department/:departmentId')
    findByDepartment(
        @Param('departmentId', ParseIntPipe) departmentId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        options.where = { ...options.where, departmentId, isPrivate: false };

        return this.ticketService.findBy(accessProfile, options);
    }

    @Get('requester/:requesterId')
    findByRequester(
        @Param('requesterId', ParseIntPipe) requesterId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        options.where.requesterId = requesterId;

        return this.ticketService.findBy(accessProfile, options);
    }

    @Get('target-user/:userId')
    findByTargetUser(
        @Param('userId', ParseIntPipe) userId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        options.where.targetUserId = userId;
        return this.ticketService.findBy(accessProfile, options);
    }

    @Patch(':id')
    update(
        @Param('id') customId: string,
        @Body() updateTicketDto: UpdateTicketDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.updateTicket(accessProfile, customId, updateTicketDto);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id') customId: string,
        @Body() updateTicketStatusDto: UpdateTicketStatusDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.updateStatus(accessProfile, customId, updateTicketStatusDto);
    }

    @Post(':id/accept')
    accept(@Param('id') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.accept(accessProfile, customId);
    }

    @Post(':id/approve')
    approve(@Param('id') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.approve(accessProfile, customId);
    }

    @Post(':id/reject')
    reject(@Param('id') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.reject(accessProfile, customId);
    }

    @Post(':id/cancel')
    cancel(@Param('id') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.cancel(accessProfile, customId);
    }

    @Delete(':id')
    delete(@Param('id') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.deleteTicket(accessProfile, customId);
    }
}
