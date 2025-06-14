import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomForbiddenException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { EmailService } from '../../shared/services/email/email.service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { extractFileName, extractMimeTypeFromUrl } from '../../shared/utils/file-helper';
import { CorrectionRequestService } from '../correction-request-reason/correction-request-reason.service';
import { CreateCorrectionRequestDto } from '../correction-request-reason/dtos/create-correction-request-reason.dto';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { TenantRepository } from '../tenant/tenant.repository';
import { CreateTicketCancellationReasonDto } from '../ticket-cancellation-reason/dtos/create-ticket-cancellation-reason.dto';
import { TicketCancellationReasonService } from '../ticket-cancellation-reason/ticket-cancellation-reason.service';
import { CreateTicketDisapprovalReasonDto } from '../ticket-disapproval-reason/dtos/create-ticket-rejection-reason.dto';
import { TicketDisapprovalReasonService } from '../ticket-disapproval-reason/ticket-disapproval-reason.service';
import { TicketFileRepository } from '../ticket-file/ticket-file.repository';
import { TicketActionType } from '../ticket-updates/entities/ticket-update.entity';
import { TicketUpdateRepository } from '../ticket-updates/ticket-update.repository';
import { UserRepository } from '../user/user.repository';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { UpdateTicketDto } from './dtos/update-ticket.dto';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketRepository } from './ticket.repository';

@Injectable()
export class TicketService extends TenantBoundBaseService<Ticket> {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly ticketRepository: TicketRepository,
        private readonly notificationService: NotificationService,
        private readonly notificationRepository: NotificationRepository,
        private readonly userRepository: UserRepository,
        private readonly ticketUpdateRepository: TicketUpdateRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly ticketFileRepository: TicketFileRepository,
        private readonly ticketCancellationReasonService: TicketCancellationReasonService,
        private readonly ticketDisapprovalReasonService: TicketDisapprovalReasonService,
        private readonly correctionRequestService: CorrectionRequestService,
        private readonly emailService: EmailService,
    ) {
        super(ticketRepository);
    }

    async findAll(accessProfile: AccessProfile, options?: QueryOptions<Ticket>) {
        const filters = {
            ...options,
            relations: [
                'requester',
                'targetUser',
                'department',
                'files',
                'cancellationReason',
                'disapprovalReason',
                'correctionRequests',
            ],
            order: { createdAt: 'DESC' } as any,
            tenantAware: false,
        };
        return super.findMany(accessProfile, filters);
    }

    async findMany(accessProfile: AccessProfile, options?: QueryOptions<Ticket>) {
        const filters = {
            ...options,
            relations: [
                'requester',
                'targetUser',
                'department',
                'files',
                'updates',
                'cancellationReason',
                'disapprovalReason',
                'correctionRequests',
            ],
            order: { createdAt: 'DESC' } as any,
        };
        return super.findMany(accessProfile, filters);
    }

    async findById(accessProfile: AccessProfile, customId: string): Promise<Ticket> {
        return this.findOne(accessProfile, {
            where: { customId },
            relations: [
                'requester',
                'targetUser',
                'department',
                'files',
                'cancellationReason',
                'disapprovalReason',
                'correctionRequests',
            ],
        });
    }

    async findBy(
        accessProfile: AccessProfile,
        options?: QueryOptions<Ticket>,
    ): Promise<PaginatedResponse<Ticket>> {
        const queryOptions = {
            ...options,
            where: this.buildQueryWhere(options.where),
            relations: [
                'requester',
                'targetUser',
                'department',
                'files',
                'cancellationReason',
                'disapprovalReason',
                'correctionRequests',
            ],
            order: { createdAt: 'DESC' } as any,
        };

        return super.findMany(accessProfile, queryOptions);
    }

    private buildQueryWhere(where: FindOptionsWhere<Ticket>) {
        const queryWhere: any = { ...where };

        if (where.name) {
            queryWhere.name = ILike(`%${where.name}%`);
        }

        return queryWhere;
    }

    async create(accessProfile: AccessProfile, ticketDto: CreateTicketDto) {
        const { files, ...ticketData } = ticketDto;

        const requester = await this.userRepository.findOne({
            where: { id: ticketDto.requesterId, tenantId: accessProfile.tenantId },
        });

        const targetUser = await this.userRepository.findOne({
            where: { id: ticketDto.targetUserId, tenantId: accessProfile.tenantId },
        });

        if (!requester) {
            throw new CustomNotFoundException({
                message: 'Requester not found',
                code: 'requester-not-found',
            });
        }

        let createdTicket: Ticket;

        await this.dataSource.transaction(async (manager) => {
            const lastTicket = await manager
                .createQueryBuilder(Ticket, 'ticket')
                .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                .orderBy('ticket.id', 'DESC')
                .setLock('pessimistic_write')
                .getOne();

            const tenant = await this.tenantRepository.findOne({
                where: { id: accessProfile.tenantId },
            });

            if (!tenant) {
                throw new CustomNotFoundException({
                    message: 'Tenant not found',
                    code: 'tenant-not-found',
                });
            }

            const nextNumber = lastTicket ? parseInt(lastTicket.customId.split('-')[1]) + 1 : 1;
            const customId = `${tenant.customKey}-${nextNumber}`;

            const ticket = manager.create(Ticket, {
                ...ticketData,
                customId,
                tenantId: accessProfile.tenantId,
                createdById: requester.id,
                updatedById: requester.id,
            });

            createdTicket = await manager.save(ticket);

            if (files?.length) {
                const ticketFiles = files.map((url: string) => ({
                    tenantId: accessProfile.tenantId,
                    url,
                    name: extractFileName(url),
                    mimeType: extractMimeTypeFromUrl(url),
                    ticketId: ticket.id,
                    createdById: requester.id,
                    updatedById: requester.id,
                }));

                await manager.save(this.ticketFileRepository.create(ticketFiles));
            }

            await manager.save(
                this.ticketUpdateRepository.create({
                    tenantId: accessProfile.tenantId,
                    ticketId: createdTicket.id,
                    ticketCustomId: createdTicket.customId,
                    performedById: requester.id,
                    createdById: requester.id,
                    updatedById: requester.id,
                    action: TicketActionType.Creation,
                    toStatus: TicketStatus.Pending,
                    description: '<p><span>user</span> criou este ticket.</p>',
                }),
            );

            await manager.save(
                this.notificationRepository.create({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.Open,
                    message: `<p>Novo ticket criado por <span>user</span>.</p>`,
                    createdById: requester.id,
                    updatedById: requester.id,
                    targetUserId: ticketDto.targetUserId,
                    resourceId: createdTicket.id,
                    resourceCustomId: createdTicket.customId,
                }),
            );

            const message = `Novo ticket criado por <span style="font-weight: 600;">${requester.firstName} ${requester.lastName}</span>.`;

            this.emailService.sendMail({
                subject: `Um novo ticket foi criado para você.`,
                html: this.emailService.compileTemplate('ticket-update', { message }),
                to: targetUser.email,
            });
        });

        //Uncomment when ready to use SSE
        // this.notificationService.sendNotification(ticket.targetUserId, {
        //     type: NotificationType.StatusUpdated,
        //     message: `Novo ticket criado por ${requester.firstName} ${requester.lastName}.`,
        //     resourceId: ticketResponse.id,
        // });

        return createdTicket;
    }

    async updateTicket(accessProfile: AccessProfile, customId: string, ticketDto: UpdateTicketDto) {
        const ticketResponse = await this.findById(accessProfile, customId);

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        if (accessProfile.userId !== ticketResponse.requester.id) {
            throw new CustomForbiddenException({
                message: 'User not allowed to update this ticket.',
                code: 'user-not-allowed-to-update-ticket',
            });
        }

        await this.repository.update(ticketResponse.id, ticketDto);

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.Update,
            fromStatus: ticketResponse.status as TicketStatus,
            toStatus: ticketResponse.status as TicketStatus,
            description: '<p><span>user</span> atualizou este ticket.</p>',
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: '<p><span>user</span> atualizou o ticket <span>resource</span>.</p>',
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: ticketResponse.targetUser.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
        });

        return ticketResponse;
    }

    async updateStatus(
        accessProfile: AccessProfile,
        customId: string,
        ticketUpdate: UpdateTicketStatusDto,
    ) {
        return this.dataSource.transaction(async () => {
            const ticket = await this.findById(accessProfile, customId);
            const currentStatus = ticket.status;

            if (!ticket) {
                throw new CustomNotFoundException({
                    code: 'ticket-not-found',
                    message: 'Ticket not found.',
                });
            }

            Object.assign(ticket, ticketUpdate);
            await this.repository.update(ticket.id, ticketUpdate);
            if (ticketUpdate.status === TicketStatus.AwaitingVerification) {
                let timeSecondsInLastStatus = null;

                const lastStatusUpdate = await this.findLastStatusUpdate(
                    ticket.id,
                    TicketStatus.InProgress,
                );

                if (lastStatusUpdate) {
                    timeSecondsInLastStatus = this.calculateTimeInSeconds(
                        lastStatusUpdate.createdAt,
                        new Date(),
                    );
                }

                await Promise.all([
                    this.ticketUpdateRepository.save({
                        tenantId: accessProfile.tenantId,
                        ticketId: ticket.id,
                        ticketCustomId: ticket.customId,
                        performedById: ticket.targetUser.id,
                        createdById: ticket.targetUser.id,
                        updatedById: ticket.targetUser.id,
                        action: TicketActionType.StatusUpdate,
                        fromStatus: TicketStatus.InProgress,
                        toStatus: TicketStatus.AwaitingVerification,
                        timeSecondsInLastStatus,
                        description:
                            '<p><span>user</span> enviou este ticket para verificação.</p>',
                    }),
                    this.notificationRepository.save({
                        tenantId: accessProfile.tenantId,
                        type: NotificationType.StatusUpdate,
                        message:
                            '<p><span>user</span> enviou o ticket <span>resource</span> para verificação.</p>',
                        createdById: ticket.targetUser.id,
                        updatedById: ticket.targetUser.id,
                        targetUserId: ticket.requester.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                ]);

                const message = `<span style="font-weight: 600;">${ticket.targetUser.firstName} ${ticket.targetUser.lastName}</span> enviou o ticket <span style="font-weight: 600;">${ticket.customId}</span> para verificação.`;

                this.emailService.sendMail({
                    subject: `O ticket ${ticket.customId} está pronto para verificação.`,
                    html: this.emailService.compileTemplate('ticket-update', { message }),
                    to: ticket.requester.email,
                });
            } else if (
                ticketUpdate.status === TicketStatus.InProgress &&
                currentStatus === TicketStatus.AwaitingVerification
            ) {
                let timeSecondsInLastStatus = null;

                const lastStatusUpdate = await this.findLastStatusUpdate(
                    ticket.id,
                    TicketStatus.AwaitingVerification,
                );

                if (lastStatusUpdate) {
                    timeSecondsInLastStatus = this.calculateTimeInSeconds(
                        lastStatusUpdate.createdAt,
                        new Date(),
                    );
                }

                await Promise.all([
                    this.ticketUpdateRepository.save({
                        tenantId: accessProfile.tenantId,
                        ticketId: ticket.id,
                        ticketCustomId: ticket.customId,
                        performedById: ticket.targetUser.id,
                        createdById: ticket.targetUser.id,
                        updatedById: ticket.targetUser.id,
                        action: TicketActionType.StatusUpdate,
                        fromStatus: TicketStatus.AwaitingVerification,
                        toStatus: TicketStatus.InProgress,
                        timeSecondsInLastStatus,
                        description: '<p><span>user</span> cancelou o envio para verificação.</p>',
                    }),
                    this.notificationRepository.save({
                        tenantId: accessProfile.tenantId,
                        type: NotificationType.StatusUpdate,
                        message:
                            '<p><span>user</span> cancelou o envio do ticket <span>resource</span> para verificação.</p>',
                        createdById: ticket.targetUser.id,
                        updatedById: ticket.targetUser.id,
                        targetUserId: ticket.requester.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                ]);

                const message = `<span style="font-weight: 600;">${ticket.targetUser.firstName} ${ticket.targetUser.lastName}</span> cancelou o envio do ticket <span style="font-weight: 600;">${ticket.customId}</span> para verificação.`;

                this.emailService.sendMail({
                    subject: `Envio do ticket ${ticket.customId} para verificação foi cancelado`,
                    html: this.emailService.compileTemplate('ticket-update', { message }),
                    to: ticket.requester.email,
                });
            } else if (
                ticketUpdate.status === TicketStatus.UnderVerification &&
                currentStatus === TicketStatus.AwaitingVerification
            ) {
                let timeSecondsInLastStatus = null;

                const lastStatusUpdate = await this.findLastStatusUpdate(
                    ticket.id,
                    TicketStatus.AwaitingVerification,
                );

                if (lastStatusUpdate) {
                    timeSecondsInLastStatus = this.calculateTimeInSeconds(
                        lastStatusUpdate.createdAt,
                        new Date(),
                    );
                }

                await Promise.all([
                    this.ticketUpdateRepository.save({
                        tenantId: accessProfile.tenantId,
                        ticketId: ticket.id,
                        ticketCustomId: ticket.customId,
                        performedById: ticket.requester.id,
                        createdById: ticket.requester.id,
                        updatedById: ticket.requester.id,
                        action: TicketActionType.StatusUpdate,
                        fromStatus: TicketStatus.AwaitingVerification,
                        toStatus: TicketStatus.UnderVerification,
                        timeSecondsInLastStatus,
                        description: '<p><span>user</span> iniciou a verificação do ticket.</p>',
                    }),
                    this.notificationRepository.save({
                        tenantId: accessProfile.tenantId,
                        type: NotificationType.StatusUpdate,
                        message:
                            '<p><span>user</span> iniciou a verificação do ticket <span>resource</span>.</p>',
                        createdById: ticket.requester.id,
                        updatedById: ticket.requester.id,
                        targetUserId: ticket.targetUser.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                ]);

                const message = `<span style="font-weight: 600;">${ticket.requester.firstName} ${ticket.requester.lastName}</span> iniciou a verificação do ticket <span style="font-weight: 600;">${ticket.customId}</span>.`;

                this.emailService.sendMail({
                    subject: `Verificação do ticket ${ticket.customId} foi iniciada`,
                    html: this.emailService.compileTemplate('ticket-update', { message }),
                    to: ticket.targetUser.email,
                });
            } else if (
                ticketUpdate.status === TicketStatus.InProgress &&
                currentStatus === TicketStatus.Returned
            ) {
                let timeSecondsInLastStatus = null;

                const lastStatusUpdate = await this.findLastStatusUpdate(
                    ticket.id,
                    TicketStatus.Returned,
                );

                if (lastStatusUpdate) {
                    timeSecondsInLastStatus = this.calculateTimeInSeconds(
                        lastStatusUpdate.createdAt,
                        new Date(),
                    );
                }

                await Promise.all([
                    this.ticketUpdateRepository.save({
                        tenantId: accessProfile.tenantId,
                        ticketId: ticket.id,
                        ticketCustomId: ticket.customId,
                        performedById: ticket.targetUser.id,
                        createdById: ticket.targetUser.id,
                        updatedById: ticket.targetUser.id,
                        action: TicketActionType.StatusUpdate,
                        fromStatus: TicketStatus.Returned,
                        toStatus: TicketStatus.InProgress,
                        timeSecondsInLastStatus,
                        description: '<p><span>user</span> iniciou a correção do ticket.</p>',
                    }),
                    this.notificationRepository.save({
                        tenantId: accessProfile.tenantId,
                        type: NotificationType.StatusUpdate,
                        message:
                            '<p><span>user</span> iniciou a correção do ticket <span>resource</span>.</p>',
                        createdById: ticket.targetUser.id,
                        updatedById: ticket.targetUser.id,
                        targetUserId: ticket.requester.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                ]);

                const message = `<span style="font-weight: 600;">${ticket.targetUser.firstName} ${ticket.targetUser.lastName}</span> iniciou a correção do ticket <span style="font-weight: 600;">${ticket.customId}</span>.`;

                this.emailService.sendMail({
                    subject: `Correção do ticket ${ticket.customId} foi iniciada`,
                    html: this.emailService.compileTemplate('ticket-update', { message }),
                    to: ticket.requester.email,
                });
            }

            const updatedTicket = await this.findById(accessProfile, customId);

            return {
                message: 'Successfully updated!',
                ticketData: updatedTicket,
            };
        });
    }

    // protected async update(accessProfile: AccessProfile, id: number, data: QueryDeepPartialEntity<T>) {
    //     // if (!user.isAdmin) {
    //     //   const existing = await this.repository.findOne({ where: { id, tenantId: accessProfile.tenantId } as any });
    //     //   if (!existing) throw new Error('Unauthorized or not found');
    //     // }

    //     const existing = await this.repository.findOne({
    //         where: { id, tenantId: accessProfile.tenantId } as any,
    //     });
    //     if (!existing) throw new Error('Unauthorized or not found');

    //     return this.repository.update(id, data);
    // }

    async accept(accessProfile: AccessProfile, customId: string) {
        const ticketResponse = await this.findById(accessProfile, customId);

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        await this.repository.update(ticketResponse.id, {
            status: TicketStatus.InProgress,
            acceptedAt: new Date().toISOString(),
        });

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        const { targetUser, requester } = ticketResponse;

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticketResponse.id,
            TicketStatus.Pending,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: targetUser.id,
            createdById: targetUser.id,
            updatedById: targetUser.id,
            action: TicketActionType.StatusUpdate,
            fromStatus: TicketStatus.Pending,
            toStatus: TicketStatus.InProgress,
            timeSecondsInLastStatus,
            description: '<p><span>user</span> aceitou este ticket.</p>',
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.StatusUpdate,
            message: '<p><span>user</span> aceitou o ticket <span>resource</span>.</p>',
            createdById: targetUser.id,
            updatedById: targetUser.id,
            targetUserId: requester.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
        });

        const message = `<span style="font-weight: 600;">${targetUser.firstName} ${targetUser.lastName}</span> aceitou o ticket <span style="font-weight: 600;">${ticketResponse.customId}</span>.`;

        this.emailService.sendMail({
            subject: `O ticket ${ticketResponse.customId} foi aceite`,
            html: this.emailService.compileTemplate('ticket-update', { message }),
            to: requester.email,
        });

        // this.notificationService.sendNotification(requester.id, {
        //     type: NotificationType.StatusUpdated,
        //     message: `${targetUser.firstName} ${targetUser.lastName} aceitou o ticket #${ticketResponse.id}.`,
        //     resourceId: ticketResponse.id,
        // });

        return {
            message: 'Ticket accepted!',
            ticketId: customId,
        };
    }

    async approve(accessProfile: AccessProfile, customId: string) {
        const ticketResponse = await this.findById(accessProfile, customId);

        const { targetUser, requester } = ticketResponse;

        await this.repository.update(ticketResponse.id, {
            status: TicketStatus.Completed,
            completedAt: new Date().toISOString(),
        });

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticketResponse.id,
            TicketStatus.UnderVerification,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: requester.id,
            createdById: requester.id,
            updatedById: requester.id,
            action: TicketActionType.Completion,
            fromStatus: TicketStatus.UnderVerification,
            toStatus: TicketStatus.Completed,
            timeSecondsInLastStatus,
            description: '<p><span>user</span> aprovou este ticket.</p>',
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.StatusUpdate,
            message: '<p><span>user</span> aprovou o ticket <span>resource</span>.</p>',
            createdById: requester.id,
            updatedById: requester.id,
            targetUserId: targetUser.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
        });

        const message = `<span style="font-weight: 600;">${ticketResponse.requester.firstName} ${ticketResponse.requester.lastName}</span> aprovou o ticket <span style="font-weight: 600;">${ticketResponse.customId}</span>.`;

        this.emailService.sendMail({
            subject: `O ticket ${ticketResponse.customId} foi aprovado.`,
            html: this.emailService.compileTemplate('ticket-update', { message }),
            to: ticketResponse.targetUser.email,
        });

        return {
            message: 'Ticket successfully approved!',
            ticketId: customId,
        };
    }

    async reject(
        accessProfile: AccessProfile,
        customId: string,
        reasonDto: CreateTicketDisapprovalReasonDto,
    ) {
        const ticketResponse = await this.findById(accessProfile, customId);

        const { targetUser, requester } = ticketResponse;

        await this.repository.update(ticketResponse.id, {
            status: TicketStatus.Rejected,
            completedAt: new Date().toISOString(),
        });

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticketResponse.id,
            TicketStatus.UnderVerification,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: requester.id,
            createdById: requester.id,
            updatedById: requester.id,
            action: TicketActionType.StatusUpdate,
            fromStatus: ticketResponse.status as TicketStatus,
            toStatus: TicketStatus.Rejected,
            timeSecondsInLastStatus,
            description: `<p><span>user</span> reprovou este ticket.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.StatusUpdate,
            message: `<p><span>user</span> reprovou o ticket <span>resource</span>.</p>`,
            createdById: requester.id,
            updatedById: requester.id,
            targetUserId: targetUser.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
        });

        await this.ticketDisapprovalReasonService.create(
            accessProfile,
            ticketResponse.id,
            ticketResponse.customId,
            reasonDto,
        );

        const message = `<span style="font-weight: 600;">${ticketResponse.requester.firstName} ${ticketResponse.requester.lastName}</span> reprovou o ticket <span style="font-weight: 600;">${ticketResponse.customId}</span> por <span style="font-weight: 600;">${reasonDto.reason}</span>.`;

        this.emailService.sendMail({
            subject: `O ticket ${ticketResponse.customId} foi reprovado.`,
            html: this.emailService.compileTemplate('ticket-update', { message }),
            to: ticketResponse.targetUser.email,
        });

        const updatedTicket = await this.findById(accessProfile, customId);

        return updatedTicket;
    }

    async cancel(
        accessProfile: AccessProfile,
        customId: string,
        reasonDto: CreateTicketCancellationReasonDto,
    ) {
        const ticketResponse = await this.findById(accessProfile, customId);
        const { targetUser, requester } = ticketResponse;

        if (accessProfile.userId !== requester.id) {
            throw new CustomForbiddenException({
                message: 'User not allowed to cancel this ticket.',
                code: 'user-not-allowed-to-cancel-ticket',
            });
        }

        await this.repository.update(ticketResponse.id, {
            status: TicketStatus.Canceled,
            canceledAt: new Date(),
        });

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticketResponse.id,
            ticketResponse.status,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: requester.id,
            createdById: requester.id,
            updatedById: requester.id,
            action: TicketActionType.Cancellation,
            fromStatus: ticketResponse.status as TicketStatus,
            toStatus: TicketStatus.Canceled,
            timeSecondsInLastStatus,
            description: `<p><span>user</span> cancelou este ticket.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.Cancellation,
            message: `<p><span>user</span> cancelou o ticket <span>resource</span> por ${reasonDto.reason}.</p>`,
            createdById: requester.id,
            updatedById: requester.id,
            targetUserId: targetUser.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
        });

        // Create the cancellation reason directly
        await this.ticketCancellationReasonService.create(
            accessProfile,
            ticketResponse.id,
            ticketResponse.customId,
            reasonDto,
        );

        const message = `<span style="font-weight: 600;">${ticketResponse.requester.firstName} ${ticketResponse.requester.lastName}</span> cancelou o ticket <span style="font-weight: 600;">${ticketResponse.customId}</span> por <span style="font-weight: 600;">${reasonDto.reason}</span>.`;

        this.emailService.sendMail({
            subject: `O ticket ${ticketResponse.customId} foi cancelado.`,
            html: this.emailService.compileTemplate('ticket-update', { message }),
            to: ticketResponse.targetUser.email,
        });

        const updatedTicket = await this.findById(accessProfile, customId);

        return updatedTicket;
    }

    async deleteTicket(accessProfile: AccessProfile, customId: string) {
        try {
            const entity = await this.repository.findOne({
                where: { customId, tenantId: accessProfile.tenantId } as any,
            });

            if (!entity) {
                throw new Error('Unauthorized or not found');
            }

            await this.repository.remove(entity);
        } catch (error) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found or already deleted',
            });
        }
    }

    private calculateTimeInSeconds(startDate: Date, endDate: Date): number {
        const diff = endDate.getTime() - startDate.getTime();
        return Math.floor(diff / 1000);
    }

    private async findLastStatusUpdate(ticketId: number, status: string): Promise<any> {
        return this.ticketUpdateRepository.findOne({
            where: {
                ticketId,
                toStatus: status,
            },
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async addFiles(accessProfile: AccessProfile, customId: string, files: string[]) {
        const ticket = await this.findOne(accessProfile, {
            where: { customId },
            relations: ['files', 'cancellationReason', 'disapprovalReason', 'correctionRequests'],
        });

        if (!ticket) {
            throw new CustomNotFoundException({
                message: 'Ticket not found',
                code: 'ticket-not-found',
            });
        }

        const ticketFiles = files.map((url: string) => ({
            tenantId: accessProfile.tenantId,
            url,
            name: extractFileName(url),
            mimeType: extractMimeTypeFromUrl(url),
            ticketId: ticket.id,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
        }));

        await this.ticketFileRepository.save(this.ticketFileRepository.create(ticketFiles));

        await this.ticketUpdateRepository.save(
            this.ticketUpdateRepository.create({
                tenantId: accessProfile.tenantId,
                ticketId: ticket.id,
                ticketCustomId: ticket.customId,
                performedById: accessProfile.userId,
                createdById: accessProfile.userId,
                updatedById: accessProfile.userId,
                action: TicketActionType.Update,
                fromStatus: ticket.status,
                toStatus: ticket.status,
                description: `<p><span>user</span> adicionou ${files.length} arquivo(s) ao ticket.</p>`,
            }),
        );

        const updatedTicket = await this.findById(accessProfile, customId);

        return updatedTicket;
    }

    async findArchived(accessProfile: AccessProfile, options?: QueryOptions<Ticket>) {
        const qb = this.repository
            .createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.requester', 'requester')
            .leftJoinAndSelect('ticket.targetUser', 'targetUser')
            .leftJoinAndSelect('ticket.department', 'department')
            .leftJoinAndSelect('ticket.files', 'files')
            .leftJoinAndSelect('ticket.updates', 'updates')
            .leftJoinAndSelect('ticket.cancellationReason', 'cancellationReason')
            .leftJoinAndSelect('ticket.disapprovalReason', 'disapprovalReason')
            .leftJoinAndSelect('ticket.correctionRequests', 'correctionRequests')
            .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere('(ticket.requesterId = :userId OR ticket.targetUserId = :userId)', {
                userId: accessProfile.userId,
            })
            .andWhere('ticket.status IN (:...statuses)', {
                statuses: [TicketStatus.Completed, TicketStatus.Rejected, TicketStatus.Canceled],
            })
            .orderBy('ticket.createdAt', 'DESC');

        if (options?.where) {
            if (options.where.name) {
                qb.andWhere('ticket.name ILIKE :name', { name: `%${options.where.name}%` });
            }
            if (options.where.departmentId) {
                qb.andWhere('ticket.departmentId = :departmentId', {
                    departmentId: options.where.departmentId,
                });
            }
        }

        const page = options?.page || 1;
        const limit = options?.limit || 10;
        qb.skip((page - 1) * limit).take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async requestCorrection(
        accessProfile: AccessProfile,
        customId: string,
        dto: CreateCorrectionRequestDto,
    ) {
        const ticket = await this.findById(accessProfile, customId);

        if (!ticket) {
            throw new CustomNotFoundException({
                message: 'Ticket not found',
                code: 'ticket-not-found',
            });
        }

        if (ticket.status !== TicketStatus.UnderVerification) {
            throw new CustomForbiddenException({
                message: 'Ticket must be under verification to request a correction',
                code: 'ticket-not-under-verification',
            });
        }

        await this.repository.update(ticket.id, {
            status: TicketStatus.Returned,
        });

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticket.id,
            TicketStatus.UnderVerification,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.StatusUpdate,
            fromStatus: TicketStatus.UnderVerification,
            toStatus: TicketStatus.Returned,
            timeSecondsInLastStatus,
            description: `<p><span>user</span> devolveu este ticket para correção.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.CorrectionRequest,
            message: `<p><span>user</span> solicitou uma correção no ticket <span>resource</span> por ${dto.reason}.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: ticket.targetUserId,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        await this.correctionRequestService.create(
            accessProfile,
            ticket.id,
            ticket.customId,
            ticket.targetUserId,
            dto,
        );

        const requester = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        const targetUser = await this.userRepository.findOne({
            where: { id: ticket.targetUserId, tenantId: accessProfile.tenantId },
        });

        if (requester && targetUser) {
            const message = `<span style="font-weight: 600;">${requester.firstName} ${requester.lastName}</span> solicitou uma correção no ticket <span style="font-weight: 600;">${ticket.customId}</span>.`;

            this.emailService.sendMail({
                subject: `Uma correção foi solicitada no ticket ${ticket.customId}.`,
                html: this.emailService.compileTemplate('ticket-update', { message }),
                to: targetUser.email,
            });
        }

        return this.findById(accessProfile, customId);
    }
}
