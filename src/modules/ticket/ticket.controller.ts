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
import { In, Not } from 'typeorm';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { TermsAcceptanceRequiredGuard } from '../../shared/guards/terms-acceptance-required.guard';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { CreateCorrectionRequestDto } from '../correction-request-reason/dtos/create-correction-request-reason.dto';
import { CreateTicketCancellationReasonDto } from '../ticket-cancellation-reason/dtos/create-ticket-cancellation-reason.dto';
import { CreateTicketDisapprovalReasonDto } from '../ticket-disapproval-reason/dtos/create-ticket-rejection-reason.dto';
import { AddTicketFilesDto } from './dtos/add-ticket-files.dto';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { UpdateTicketDto } from './dtos/update-ticket.dto';
import { UpdateTicketAssigneeDto } from './dtos/update-ticket-assignee.dto';
import { AddTicketAssigneeDto } from './dtos/add-ticket-assignee.dto';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketService } from './ticket.service';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'), SubscriptionRequiredGuard, TermsAcceptanceRequiredGuard)
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @Post()
    create(
        @Body() createTicketDto: CreateTicketDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.create(accessProfile, createTicketDto);
    }

    @Get('all')
    findAll(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Ticket>,
    ) {
        return this.ticketService.findAll(accessProfile, options);
    }

    @Get()
    findMany(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Ticket>,
    ) {
        return this.ticketService.findMany(accessProfile, options);
    }

    @Get('archived')
    findArchived(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Ticket>,
    ) {
        return this.ticketService.findArchived(accessProfile, options);
    }

    /**
     * Get ticket by customId (public-facing endpoint)
     */
    @Get(':customId')
    findById(
        @Param('customId') customId: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.findById(accessProfile, customId);
    }

    @Get('department/:departmentId')
    findByDepartment(
        @Param('departmentId', ParseIntPipe) departmentId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.findByDepartment(accessProfile, departmentId, options);
    }

    @Get('requester/:requesterId')
    findByRequester(
        @Param('requesterId', ParseIntPipe) requesterId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        // Create the base where clause with requesterId
        const whereClause: any = {
            ...options.where,
            requesterId,
        };

        // Only apply the default status filter if no status filter is provided
        const whereWithStatus = options.where as any;
        if (!options.where || whereWithStatus?.status === undefined) {
            whereClause.status = Not(
                In([TicketStatus.Completed, TicketStatus.Rejected, TicketStatus.Canceled]),
            );
        }

        options.where = whereClause;

        return this.ticketService.findBy(accessProfile, options);
    }

    @Get('target-user/:userId')
    findByTargetUser(
        @Param('userId', ParseIntPipe) userId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.findByTargetUser(accessProfile, userId, options);
    }

    @Get('received/:userId')
    findReceivedTickets(
        @Param('userId', ParseIntPipe) userId: number,
        @GetQueryOptions() options: QueryOptions<Ticket>,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        // Pass the options directly to the service method
        // The service will handle the OR condition for targetUserId and reviewerId
        return this.ticketService.findByReceived(accessProfile, userId, options);
    }

    /**
     * Update ticket by customId (public-facing endpoint)
     */
    @Patch(':customId')
    update(
        @Param('customId') customId: string,
        @Body() updateTicketDto: UpdateTicketDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.updateTicket(accessProfile, customId, updateTicketDto);
    }

    /**
     * Update ticket status by customId (public-facing endpoint)
     */
    @Patch(':customId/status')
    updateStatus(
        @Param('customId') customId: string,
        @Body() updateTicketStatusDto: UpdateTicketStatusDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.updateStatus(accessProfile, customId, updateTicketStatusDto);
    }

    /**
     * Accept ticket by customId (public-facing endpoint)
     */
    @Post(':customId/accept')
    accept(@Param('customId') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.accept(accessProfile, customId);
    }

    /**
     * Approve ticket by customId (public-facing endpoint)
     */
    @Post(':customId/approve')
    approve(@Param('customId') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.approve(accessProfile, customId);
    }

    /**
     * Reject ticket by customId (public-facing endpoint)
     */
    @Post(':customId/reject')
    reject(
        @Param('customId') customId: string,
        @Body() createDisapprovalReasonDto: CreateTicketDisapprovalReasonDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.reject(accessProfile, customId, createDisapprovalReasonDto);
    }

    /**
     * Cancel ticket by customId (public-facing endpoint)
     */
    @Post(':customId/cancel')
    cancel(
        @Param('customId') customId: string,
        @Body() createCancellationReasonDto: CreateTicketCancellationReasonDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.cancel(accessProfile, customId, createCancellationReasonDto);
    }

    /**
     * Delete ticket by customId (public-facing endpoint)
     */
    @Delete(':customId')
    delete(@Param('customId') customId: string, @GetAccessProfile() accessProfile: AccessProfile) {
        return this.ticketService.deleteTicket(accessProfile, customId);
    }

    /**
     * Add files to ticket by customId (public-facing endpoint)
     */
    @Post(':customId/files')
    addFiles(
        @Param('customId') customId: string,
        @Body() addTicketFilesDto: AddTicketFilesDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.addFiles(accessProfile, customId, addTicketFilesDto.files);
    }

    /**
     * Request correction for ticket by customId (public-facing endpoint)
     */
    @Post(':customId/request-correction')
    requestCorrection(
        @Param('customId') customId: string,
        @Body() createCorrectionRequestDto: CreateCorrectionRequestDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.requestCorrection(
            accessProfile,
            customId,
            createCorrectionRequestDto,
        );
    }

    /**
     * Update ticket assignee by customId (public-facing endpoint)
     */
    @Patch(':customId/assignee')
    updateAssignee(
        @Param('customId') customId: string,
        @Body() updateAssigneeDto: UpdateTicketAssigneeDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.updateAssignee(
            accessProfile,
            customId,
            updateAssigneeDto.targetUserId,
            updateAssigneeDto.order,
        );
    }

    /**
     * Add new ticket assignee by customId (public-facing endpoint)
     */
    @Post(':customId/assignee')
    addAssignee(
        @Param('customId') customId: string,
        @Body() addAssigneeDto: AddTicketAssigneeDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.addAssignee(
            accessProfile,
            customId,
            addAssigneeDto.targetUserId,
            addAssigneeDto.order,
        );
    }

    /**
     * Remove target user from ticket by customId (public-facing endpoint)
     */
    @Delete(':customId/assignee/:targetUserId')
    removeAssignee(
        @Param('customId') customId: string,
        @Param('targetUserId', ParseIntPipe) targetUserId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.removeAssignee(accessProfile, customId, targetUserId);
    }

    /**
     * Update ticket reviewer by customId (public-facing endpoint)
     */
    @Patch(':customId/reviewer')
    updateReviewer(
        @Param('customId') customId: string,
        @Body() updateReviewerDto: { reviewerId: number },
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.updateReviewer(
            accessProfile,
            customId,
            updateReviewerDto.reviewerId,
        );
    }

    /**
     * Send ticket to next department by customId (public-facing endpoint)
     */
    @Post(':customId/send-to-next-department')
    sendToNextDepartment(
        @Param('customId') customId: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.sendToNextDepartment(accessProfile, customId);
    }

    /**
     * Execute custom status action by customId (public-facing endpoint)
     */
    @Post(':customId/actions/:actionId')
    executeCustomStatusAction(
        @Param('customId') customId: string,
        @Param('actionId', ParseIntPipe) actionId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.ticketService.executeCustomStatusAction(accessProfile, customId, actionId);
    }
}
