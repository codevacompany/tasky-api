import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';
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

    @Get('ticket/:ticketId')
    findByTicket(
        @Param('ticketId') ticketCustomId: string,
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options?: QueryOptions<TicketComment>,
    ) {
        return this.ticketCommentService.findBy(accessProfile, { ticketCustomId }, options);
    }

    /**
     * Get ticket comment by UUID (public-facing endpoint)
     */
    @Get(':uuid')
    async findByUuid(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<TicketComment> {
        return this.ticketCommentService.findByUuid(accessProfile, uuid);
    }

    @Post()
    async create(
        @Body() createTicketCommentDto: CreateTicketCommentDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketCommentService.create(accessProfile, createTicketCommentDto);
    }

    /**
     * Update ticket comment by UUID (public-facing endpoint)
     */
    @Patch(':uuid')
    async update(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @Body() updateTicketCommentDto: UpdateTicketCommentDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<TicketComment> {
        return this.ticketCommentService.updateCommentByUuid(
            accessProfile,
            uuid,
            updateTicketCommentDto,
        );
    }

    /**
     * Delete ticket comment by UUID (public-facing endpoint)
     */
    @Delete(':uuid')
    async delete(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        await this.ticketCommentService.deleteByUuid(accessProfile, uuid);
        return { message: 'Successfully deleted!' };
    }
}
