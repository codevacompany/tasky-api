import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, In } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomForbiddenException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { EmailService } from '../../shared/services/email/email.service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import {
    extractFileName,
    extractMimeTypeFromUrl,
    formatSnakeToNaturalCase,
} from '../../shared/utils/file-helper';
import { CorrectionRequestService } from '../correction-request-reason/correction-request-reason.service';
import { CreateCorrectionRequestDto } from '../correction-request-reason/dtos/create-correction-request-reason.dto';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { TenantRepository } from '../tenant/tenant.repository';
import { TenantSubscriptionService } from '../tenant-subscription/tenant-subscription.service';
import { CreateTicketCancellationReasonDto } from '../ticket-cancellation-reason/dtos/create-ticket-cancellation-reason.dto';
import { TicketCancellationReasonService } from '../ticket-cancellation-reason/ticket-cancellation-reason.service';
import { CreateTicketDisapprovalReasonDto } from '../ticket-disapproval-reason/dtos/create-ticket-rejection-reason.dto';
import { TicketDisapprovalReasonService } from '../ticket-disapproval-reason/ticket-disapproval-reason.service';
import { TicketFileRepository } from '../ticket-file/ticket-file.repository';
import { TicketActionType } from '../ticket-updates/entities/ticket-update.entity';
import { TicketUpdateRepository } from '../ticket-updates/ticket-update.repository';
import { TicketTargetUserRepository } from '../ticket-target-user/ticket-target-user.repository';
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
        private readonly tenantSubscriptionService: TenantSubscriptionService,
        private readonly ticketTargetUserRepository: TicketTargetUserRepository,
    ) {
        super(ticketRepository);
    }

    async findAll(accessProfile: AccessProfile, options?: QueryOptions<Ticket>) {
        const filters = {
            ...options,
            relations: [
                'requester',
                'currentTargetUser',
                'targetUsers',
                'targetUsers.user',
                'targetUsers.user.department',
                'reviewer',
                'department',
                'category',
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
                'currentTargetUser',
                'targetUsers',
                'targetUsers.user',
                'targetUsers.user.department',
                'reviewer',
                'department',
                'category',
                'files',
                'comments',
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
                'currentTargetUser',
                'targetUsers',
                'targetUsers.user',
                'targetUsers.user.department',
                'reviewer',
                'department',
                'category',
                'files',
                'comments',
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
                'currentTargetUser',
                'targetUsers',
                'targetUsers.user',
                'targetUsers.user.department',
                'reviewer',
                'department',
                'category',
                'files',
                'comments',
                'cancellationReason',
                'disapprovalReason',
                'correctionRequests',
            ],
            order: { createdAt: 'DESC' } as any,
        };

        return super.findMany(accessProfile, queryOptions);
    }

    async findByReceived(
        accessProfile: AccessProfile,
        userId: number,
        options?: QueryOptions<Ticket>,
    ): Promise<PaginatedResponse<Ticket>> {
        const qb = this.repository
            .createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.requester', 'requester')
            .leftJoinAndSelect('ticket.currentTargetUser', 'currentTargetUser')
            .leftJoinAndSelect('ticket.targetUsers', 'targetUsers')
            .leftJoinAndSelect('targetUsers.user', 'targetUser')
            .leftJoinAndSelect('targetUser.department', 'targetUserDepartment')
            .leftJoinAndSelect('ticket.reviewer', 'reviewer')
            .leftJoinAndSelect('ticket.department', 'department')
            .leftJoinAndSelect('ticket.category', 'category')
            .leftJoinAndSelect('ticket.files', 'files')
            .leftJoinAndSelect('ticket.comments', 'comments')
            .leftJoinAndSelect('ticket.cancellationReason', 'cancellationReason')
            .leftJoinAndSelect('ticket.disapprovalReason', 'disapprovalReason')
            .leftJoinAndSelect('ticket.correctionRequests', 'correctionRequests')
            .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere(
                '(ticket.currentTargetUserId = :userId OR EXISTS (SELECT 1 FROM "ticket_target_user" ttu WHERE ttu."ticketId" = ticket.id AND ttu."userId" = :userId) OR (ticket.reviewerId = :userId AND ticket.requesterId != :userId))',
                {
                    userId,
                },
            )
            .orderBy('ticket.createdAt', 'DESC');

        if (options?.where?.status) {
            qb.andWhere('ticket.status = :status', { status: options.where.status });
        } else {
            qb.andWhere('ticket.status NOT IN (:...statuses)', {
                statuses: [TicketStatus.Completed, TicketStatus.Rejected, TicketStatus.Canceled],
            });
        }

        if (options?.where) {
            if (options.where.name) {
                qb.andWhere('ticket.name ILIKE :name', { name: `%${options.where.name}%` });
            }
            if (options.where.priority) {
                qb.andWhere('ticket.priority = :priority', { priority: options.where.priority });
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

    async findByTargetUser(
        accessProfile: AccessProfile,
        userId: number,
        options?: QueryOptions<Ticket>,
    ): Promise<PaginatedResponse<Ticket>> {
        const qb = this.repository
            .createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.requester', 'requester')
            .leftJoinAndSelect('ticket.currentTargetUser', 'currentTargetUser')
            .leftJoinAndSelect('ticket.targetUsers', 'targetUsers')
            .leftJoinAndSelect('targetUsers.user', 'targetUser')
            .leftJoinAndSelect('targetUser.department', 'targetUserDepartment')
            .leftJoinAndSelect('ticket.reviewer', 'reviewer')
            .leftJoinAndSelect('ticket.department', 'department')
            .leftJoinAndSelect('ticket.category', 'category')
            .leftJoinAndSelect('ticket.files', 'files')
            .leftJoinAndSelect('ticket.comments', 'comments')
            .leftJoinAndSelect('ticket.cancellationReason', 'cancellationReason')
            .leftJoinAndSelect('ticket.disapprovalReason', 'disapprovalReason')
            .leftJoinAndSelect('ticket.correctionRequests', 'correctionRequests')
            .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere(
                '(ticket.currentTargetUserId = :userId OR EXISTS (SELECT 1 FROM "ticket_target_user" ttu WHERE ttu."ticketId" = ticket.id AND ttu."userId" = :userId))',
                {
                    userId,
                },
            )
            .orderBy('ticket.createdAt', 'DESC');

        if (options?.where?.status) {
            qb.andWhere('ticket.status = :status', { status: options.where.status });
        } else {
            qb.andWhere('ticket.status NOT IN (:...statuses)', {
                statuses: [TicketStatus.Completed, TicketStatus.Rejected, TicketStatus.Canceled],
            });
        }

        if (options?.where) {
            if (options.where.name) {
                qb.andWhere('ticket.name ILIKE :name', { name: `%${options.where.name}%` });
            }
            if (options.where.priority) {
                qb.andWhere('ticket.priority = :priority', { priority: options.where.priority });
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

    private buildQueryWhere(where: FindOptionsWhere<Ticket>) {
        const queryWhere: any = { ...where };

        if (where.name) {
            queryWhere.name = ILike(`%${where.name}%`);
        }

        return queryWhere;
    }

    async create(accessProfile: AccessProfile, ticketDto: CreateTicketDto) {
        const { files, targetUserIds, ...ticketData } = ticketDto;

        const requester = await this.userRepository.findOne({
            where: { id: ticketDto.requesterId, tenantId: accessProfile.tenantId },
        });

        if (!requester) {
            throw new CustomNotFoundException({
                message: 'Requester not found',
                code: 'requester-not-found',
            });
        }

        const targetUsers = await this.userRepository.find({
            where: { id: In(targetUserIds), tenantId: accessProfile.tenantId },
        });

        if (targetUsers.length !== targetUserIds.length) {
            throw new CustomNotFoundException({
                message: 'One or more target users not found',
                code: 'target-users-not-found',
            });
        }

        const firstTargetUser = targetUsers.find((user) => user.id === targetUserIds[0]);

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
                currentTargetUserId: firstTargetUser.id,
                reviewerId:
                    ticketDto.requesterId !== firstTargetUser.id ? ticketDto.requesterId : null,
            });

            createdTicket = await manager.save(ticket);

            const ticketTargetUsers = targetUserIds.map((userId, index) => ({
                ticketId: createdTicket.id,
                userId,
                order: index + 1,
                tenantId: accessProfile.tenantId,
                createdById: requester.id,
                updatedById: requester.id,
            }));

            await manager.save(this.ticketTargetUserRepository.create(ticketTargetUsers));

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

            const isGroupTicket = targetUserIds.length > 1;
            const messagePrefix = isGroupTicket
                ? 'criou um ticket em grupo para você'
                : 'criou um novo ticket para você';

            for (const targetUser of targetUsers) {
                if (ticketDto.requesterId !== targetUser.id) {
                    await manager.save(
                        this.notificationRepository.create({
                            tenantId: accessProfile.tenantId,
                            type: NotificationType.Open,
                            message: `<p><span>user</span> ${messagePrefix}.</p>`,
                            createdById: requester.id,
                            updatedById: requester.id,
                            targetUserId: targetUser.id,
                            resourceId: createdTicket.id,
                            resourceCustomId: createdTicket.customId,
                        }),
                    );

                    const message = `Novo ticket criado por <span style="font-weight: 600;">${requester.firstName} ${requester.lastName}</span>.`;

                    const emailNotificationsEnabled = await this.isEmailNotificationsEnabled(
                        accessProfile.tenantId,
                    );
                    if (emailNotificationsEnabled) {
                        this.emailService.sendMail({
                            subject: `Um novo ticket foi criado para você.`,
                            html: this.emailService.compileTemplate('ticket-update', { message }),
                            to: targetUser.email,
                        });
                    }
                }
            }
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

        if (
            accessProfile.userId !== ticketResponse.requester.id &&
            accessProfile.userId !== ticketResponse.currentTargetUser?.id
        ) {
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

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticketResponse.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        for (const ticketTargetUser of targetUsers) {
            if (accessProfile.userId !== ticketTargetUser.userId) {
                await this.notificationRepository.save({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.TicketUpdate,
                    message: '<p><span>user</span> atualizou o ticket <span>resource</span>.</p>',
                    createdById: accessProfile.userId,
                    updatedById: accessProfile.userId,
                    targetUserId: ticketTargetUser.userId,
                    resourceId: ticketResponse.id,
                    resourceCustomId: ticketResponse.customId,
                });
            }
        }

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
                        performedById: ticket.currentTargetUser.id,
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
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
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
                        targetUserId: ticket.reviewer.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                ]);

                const message = `<span style="font-weight: 600;">${ticket.currentTargetUser.firstName} ${ticket.currentTargetUser.lastName}</span> enviou o ticket <span style="font-weight: 600;">${ticket.customId}</span> para verificação.`;

                await this.sendEmailWithPermissionCheck(
                    accessProfile.tenantId,
                    `O ticket ${ticket.customId} está pronto para verificação.`,
                    message,
                    ticket.reviewer.email,
                );
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
                        performedById: ticket.currentTargetUser.id,
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
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
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
                        targetUserId: ticket.reviewer.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                ]);

                const message = `<span style="font-weight: 600;">${ticket.currentTargetUser.firstName} ${ticket.currentTargetUser.lastName}</span> cancelou o envio do ticket <span style="font-weight: 600;">${ticket.customId}</span> para verificação.`;

                await this.sendEmailWithPermissionCheck(
                    accessProfile.tenantId,
                    `Envio do ticket ${ticket.customId} para verificação foi cancelado`,
                    message,
                    ticket.reviewer.email,
                );
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

                const targetUsers = await this.ticketTargetUserRepository.find({
                    where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
                    relations: ['user'],
                });

                const notifications = targetUsers.map((ticketTargetUser) =>
                    this.notificationRepository.save({
                        tenantId: accessProfile.tenantId,
                        type: NotificationType.StatusUpdate,
                        message:
                            '<p><span>user</span> iniciou a verificação do ticket <span>resource</span>.</p>',
                        createdById: ticket.reviewer.id,
                        updatedById: ticket.reviewer.id,
                        targetUserId: ticketTargetUser.userId,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                );

                await Promise.all([
                    this.ticketUpdateRepository.save({
                        tenantId: accessProfile.tenantId,
                        ticketId: ticket.id,
                        ticketCustomId: ticket.customId,
                        performedById: ticket.reviewer.id,
                        createdById: ticket.reviewer.id,
                        updatedById: ticket.reviewer.id,
                        action: TicketActionType.StatusUpdate,
                        fromStatus: TicketStatus.AwaitingVerification,
                        toStatus: TicketStatus.UnderVerification,
                        timeSecondsInLastStatus,
                        description: '<p><span>user</span> iniciou a verificação do ticket.</p>',
                    }),
                    ...notifications,
                ]);

                const message = `<span style="font-weight: 600;">${ticket.reviewer.firstName} ${ticket.reviewer.lastName}</span> iniciou a verificação do ticket <span style="font-weight: 600;">${ticket.customId}</span>.`;

                for (const ticketTargetUser of targetUsers) {
                    await this.sendEmailWithPermissionCheck(
                        accessProfile.tenantId,
                        `Verificação do ticket ${ticket.customId} foi iniciada`,
                        message,
                        ticketTargetUser.user.email,
                    );
                }
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
                        performedById: ticket.currentTargetUser.id,
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
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
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
                        targetUserId: ticket.reviewer.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                ]);

                const message = `<span style="font-weight: 600;">${ticket.currentTargetUser.firstName} ${ticket.currentTargetUser.lastName}</span> iniciou a correção do ticket <span style="font-weight: 600;">${ticket.customId}</span>.`;

                await this.sendEmailWithPermissionCheck(
                    accessProfile.tenantId,
                    `Correção do ticket ${ticket.customId} foi iniciada`,
                    message,
                    ticket.reviewer.email,
                );
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

        const { currentTargetUser, requester } = ticketResponse;

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
            performedById: currentTargetUser.id,
            createdById: currentTargetUser.id,
            updatedById: currentTargetUser.id,
            action: TicketActionType.StatusUpdate,
            fromStatus: TicketStatus.Pending,
            toStatus: TicketStatus.InProgress,
            timeSecondsInLastStatus,
            description: `<p><span>user</span> ${
                ticketResponse.requester.id === currentTargetUser.id
                    ? 'começou a trabalhar neste ticket'
                    : 'aceitou este ticket'
            }.</p>`,
        });

        if (ticketResponse.requester.id !== currentTargetUser.id) {
            await this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.StatusUpdate,
                message: '<p><span>user</span> aceitou o ticket <span>resource</span>.</p>',
                createdById: currentTargetUser.id,
                updatedById: currentTargetUser.id,
                targetUserId: requester.id,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            });

            const message = `<span style="font-weight: 600;">${currentTargetUser.firstName} ${currentTargetUser.lastName}</span> aceitou o ticket <span style="font-weight: 600;">${ticketResponse.customId}</span>.`;

            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `O ticket ${ticketResponse.customId} foi aceite`,
                message,
                requester.email,
            );
        }

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
            performedById: ticketResponse.reviewer.id,
            createdById: ticketResponse.reviewer.id,
            updatedById: ticketResponse.reviewer.id,
            action: TicketActionType.Completion,
            fromStatus: TicketStatus.UnderVerification,
            toStatus: TicketStatus.Completed,
            timeSecondsInLastStatus,
            description: '<p><span>user</span> aprovou este ticket.</p>',
        });

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticketResponse.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        const notifications = targetUsers.map((ticketTargetUser) =>
            this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.StatusUpdate,
                message: '<p><span>user</span> aprovou o ticket <span>resource</span>.</p>',
                createdById: ticketResponse.reviewer.id,
                updatedById: ticketResponse.reviewer.id,
                targetUserId: ticketTargetUser.userId,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            }),
        );

        await Promise.all(notifications);

        const message = `<span style="font-weight: 600;">${ticketResponse.reviewer.firstName} ${ticketResponse.reviewer.lastName}</span> aprovou o ticket <span style="font-weight: 600;">${ticketResponse.customId}</span>.`;

        for (const ticketTargetUser of targetUsers) {
            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `O ticket ${ticketResponse.customId} foi aprovado.`,
                message,
                ticketTargetUser.user.email,
            );
        }

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
            performedById: ticketResponse.reviewer.id,
            createdById: ticketResponse.reviewer.id,
            updatedById: ticketResponse.reviewer.id,
            action: TicketActionType.StatusUpdate,
            fromStatus: ticketResponse.status as TicketStatus,
            toStatus: TicketStatus.Rejected,
            timeSecondsInLastStatus,
            description: `<p><span>user</span> reprovou este ticket.</p>`,
        });

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticketResponse.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        const notifications = targetUsers.map((ticketTargetUser) =>
            this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.StatusUpdate,
                message: `<p><span>user</span> reprovou o ticket <span>resource</span>.</p>`,
                createdById: ticketResponse.reviewer.id,
                updatedById: ticketResponse.reviewer.id,
                targetUserId: ticketTargetUser.userId,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            }),
        );

        await Promise.all(notifications);

        await this.ticketDisapprovalReasonService.create(
            accessProfile,
            ticketResponse.id,
            ticketResponse.customId,
            reasonDto,
        );

        const message = `<span style="font-weight: 600;">${ticketResponse.reviewer.firstName} ${ticketResponse.reviewer.lastName}</span> reprovou o ticket <span style="font-weight: 600;">${ticketResponse.customId}</span> por <span style="font-weight: 600;">${reasonDto.reason}</span>.`;

        for (const ticketTargetUser of targetUsers) {
            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `O ticket ${ticketResponse.customId} foi reprovado.`,
                message,
                ticketTargetUser.user.email,
            );
        }

        const updatedTicket = await this.findById(accessProfile, customId);

        return updatedTicket;
    }

    async cancel(
        accessProfile: AccessProfile,
        customId: string,
        reasonDto: CreateTicketCancellationReasonDto,
    ) {
        const ticketResponse = await this.findById(accessProfile, customId);
        const { requester } = ticketResponse;

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

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticketResponse.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        const notifications = targetUsers.map((ticketTargetUser) =>
            this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.Cancellation,
                message: `<p><span>user</span> cancelou o ticket <span>resource</span> por ${reasonDto.reason}.</p>`,
                createdById: requester.id,
                updatedById: requester.id,
                targetUserId: ticketTargetUser.userId,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            }),
        );

        await Promise.all(notifications);

        // Create the cancellation reason directly
        await this.ticketCancellationReasonService.create(
            accessProfile,
            ticketResponse.id,
            ticketResponse.customId,
            reasonDto,
        );

        const message = `<span style="font-weight: 600;">${ticketResponse.requester.firstName} ${ticketResponse.requester.lastName}</span> cancelou o ticket <span style="font-weight: 600;">${ticketResponse.customId}</span> por <span style="font-weight: 600;">${reasonDto.reason}</span>.`;

        for (const ticketTargetUser of targetUsers) {
            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `O ticket ${ticketResponse.customId} foi cancelado.`,
                message,
                ticketTargetUser.user.email,
            );
        }

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

    //TODO: refactor this so these methods are in a more proper place
    private async isEmailNotificationsEnabled(tenantId: number): Promise<boolean> {
        try {
            const permissions = await this.tenantSubscriptionService.getTenantPermissions(tenantId);
            return permissions.includes('email_notifications');
        } catch (error) {
            return false;
        }
    }

    private async sendEmailWithPermissionCheck(
        tenantId: number,
        subject: string,
        message: string,
        to: string,
    ): Promise<void> {
        const emailNotificationsEnabled = await this.isEmailNotificationsEnabled(tenantId);
        if (emailNotificationsEnabled) {
            this.emailService.sendMail({
                subject,
                html: this.emailService.compileTemplate('ticket-update', { message }),
                to,
            });
        }
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
            .leftJoinAndSelect('ticket.currentTargetUser', 'currentTargetUser')
            .leftJoinAndSelect('ticket.targetUsers', 'targetUsers')
            .leftJoinAndSelect('targetUsers.user', 'targetUser')
            .leftJoinAndSelect('ticket.department', 'department')
            .leftJoinAndSelect('ticket.files', 'files')
            .leftJoinAndSelect('ticket.updates', 'updates')
            .leftJoinAndSelect('ticket.cancellationReason', 'cancellationReason')
            .leftJoinAndSelect('ticket.disapprovalReason', 'disapprovalReason')
            .leftJoinAndSelect('ticket.correctionRequests', 'correctionRequests')
            .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere('(ticket.requesterId = :userId OR ticket.currentTargetUserId = :userId)', {
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

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        let targetUserId: number;
        if (dto.targetUserId && targetUsers.length > 1) {
            const isValidTargetUser = targetUsers.some((tu) => tu.userId === dto.targetUserId);
            if (!isValidTargetUser) {
                throw new CustomForbiddenException({
                    message: 'Invalid target user for correction',
                    code: 'invalid-target-user',
                });
            }
            targetUserId = dto.targetUserId;
        } else {
            targetUserId = ticket.currentTargetUserId;
        }

        await this.repository.update(ticket.id, {
            status: TicketStatus.Returned,
            currentTargetUserId: targetUserId,
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

        const notifications = targetUsers.map((ticketTargetUser) =>
            this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.CorrectionRequest,
                message: `<p><span>user</span> solicitou uma correção no ticket <span>resource</span> por ${formatSnakeToNaturalCase(dto.reason)}.</p>`,
                createdById: accessProfile.userId,
                updatedById: accessProfile.userId,
                targetUserId: ticketTargetUser.userId,
                resourceId: ticket.id,
                resourceCustomId: ticket.customId,
            }),
        );

        await Promise.all(notifications);

        await this.correctionRequestService.create(
            accessProfile,
            ticket.id,
            ticket.customId,
            targetUserId,
            dto,
        );

        const reviewer = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        const targetUser = await this.userRepository.findOne({
            where: { id: targetUserId, tenantId: accessProfile.tenantId },
        });

        if (reviewer && targetUser) {
            const message = `<span style="font-weight: 600;">${reviewer.firstName} ${reviewer.lastName}</span> solicitou uma correção no ticket <span style="font-weight: 600;">${ticket.customId}</span>.`;

            for (const ticketTargetUser of targetUsers) {
                await this.sendEmailWithPermissionCheck(
                    accessProfile.tenantId,
                    `Uma correção foi solicitada no ticket ${ticket.customId}.`,
                    message,
                    ticketTargetUser.user.email,
                );
            }
        }

        return this.findById(accessProfile, customId);
    }

    async updateAssignee(
        accessProfile: AccessProfile,
        customId: string,
        newTargetUserId: number,
        order: number,
    ) {
        const ticket = await this.findById(accessProfile, customId);

        const newTargetUser = await this.userRepository.findOne({
            where: {
                id: newTargetUserId,
                tenantId: accessProfile.tenantId,
                isActive: true,
            },
        });

        if (!newTargetUser) {
            throw new CustomNotFoundException({
                message: 'Target user not found or inactive',
                code: 'target-user-not-found',
            });
        }

        const assigningUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (!assigningUser) {
            throw new CustomNotFoundException({
                message: 'Assigning user not found',
                code: 'assigning-user-not-found',
            });
        }

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
            order: { order: 'ASC' },
        });

        if (order < 1 || order > targetUsers.length) {
            throw new CustomForbiddenException({
                message: 'Invalid order position',
                code: 'invalid-order-position',
            });
        }

        const targetUserToReplace = targetUsers.find((tu) => tu.order === order);
        if (!targetUserToReplace) {
            throw new CustomNotFoundException({
                message: 'Target user at specified order not found',
                code: 'target-user-order-not-found',
            });
        }

        await this.ticketTargetUserRepository.update(
            { id: targetUserToReplace.id },
            { userId: newTargetUserId },
        );

        if (ticket.currentTargetUserId === targetUserToReplace.userId) {
            await this.repository.update(ticket.id, {
                currentTargetUserId: newTargetUserId,
            });
        }

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.AssigneeChange,
            description: `<p><span>user</span> substituiu ${targetUserToReplace.user.firstName} ${targetUserToReplace.user.lastName} por ${newTargetUser.firstName} ${newTargetUser.lastName}.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> atribuiu o ticket a você.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: newTargetUserId,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> removeu você do ticket <span>resource</span>.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: targetUserToReplace.userId,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        return ticket;
    }

    async sendToNextDepartment(accessProfile: AccessProfile, customId: string) {
        const ticket = await this.findById(accessProfile, customId);

        if (!ticket) {
            throw new CustomNotFoundException({
                message: 'Ticket not found',
                code: 'ticket-not-found',
            });
        }

        if (accessProfile.userId !== ticket.currentTargetUserId) {
            throw new CustomForbiddenException({
                message: 'Only the current target user can send ticket to next department',
                code: 'not-current-target-user',
            });
        }

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
            order: { order: 'ASC' },
        });

        const currentUserPosition = targetUsers.find(
            (tu) => tu.userId === ticket.currentTargetUserId,
        );
        if (!currentUserPosition) {
            throw new CustomNotFoundException({
                message: 'Current target user not found in target users list',
                code: 'current-target-user-not-found',
            });
        }

        const nextUser = targetUsers.find((tu) => tu.order === currentUserPosition.order + 1);
        if (!nextUser) {
            throw new CustomForbiddenException({
                message: 'No next department available',
                code: 'no-next-target-user',
            });
        }

        await this.repository.update(ticket.id, {
            currentTargetUserId: nextUser.userId,
            status: TicketStatus.Pending,
        });

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.AssigneeChange,
            description: `<p><span>user</span> enviou este ticket para o próximo departamento.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> enviou o ticket <span>resource</span> para você.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: nextUser.userId,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        for (const targetUser of targetUsers) {
            if (targetUser.userId !== nextUser.userId) {
                await this.notificationRepository.save({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.TicketUpdate,
                    message: `<p><span>user</span> enviou o ticket <span>resource</span> para o próximo departamento.</p>`,
                    createdById: accessProfile.userId,
                    updatedById: accessProfile.userId,
                    targetUserId: targetUser.userId,
                    resourceId: ticket.id,
                    resourceCustomId: ticket.customId,
                });
            }
        }

        const currentUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        const nextUserDetails = await this.userRepository.findOne({
            where: { id: nextUser.userId, tenantId: accessProfile.tenantId },
        });

        if (currentUser && nextUserDetails) {
            const message = `<span style="font-weight: 600;">${currentUser.firstName} ${currentUser.lastName}</span> enviou o ticket <span style="font-weight: 600;">${ticket.customId}</span> para o próximo departamento.`;

            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `O ticket ${ticket.customId} foi enviado para você.`,
                message,
                nextUserDetails.email,
            );

            for (const targetUser of targetUsers) {
                if (targetUser.userId !== nextUser.userId) {
                    await this.sendEmailWithPermissionCheck(
                        accessProfile.tenantId,
                        `O ticket ${ticket.customId} foi enviado para o próximo departamento.`,
                        message,
                        targetUser.user.email,
                    );
                }
            }
        }

        return this.findById(accessProfile, customId);
    }

    async updateReviewer(accessProfile: AccessProfile, customId: string, newReviewerId: number) {
        const ticket = await this.findById(accessProfile, customId);

        const newReviewer = await this.userRepository.findOne({
            where: {
                id: newReviewerId,
                tenantId: accessProfile.tenantId,
                isActive: true,
            },
        });

        if (!newReviewer) {
            throw new CustomNotFoundException({
                message: 'Reviewer not found or inactive',
                code: 'reviewer-not-found',
            });
        }

        const assigningUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (!assigningUser) {
            throw new CustomNotFoundException({
                message: 'Assigning user not found',
                code: 'assigning-user-not-found',
            });
        }

        await this.repository.update(ticket.id, {
            reviewerId: newReviewerId,
        });

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.Update,
            description: `<p><span>user</span> definiu ${newReviewer.firstName} ${newReviewer.lastName} como revisor deste ticket.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> definiu você como revisor do ticket <span>resource</span>.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: newReviewer.id,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        return ticket;
    }
}
