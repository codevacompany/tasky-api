import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike } from 'typeorm';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomForbiddenException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { TenantRepository } from '../tenant/tenant.repository';
import { TicketActionType } from '../ticket-updates/entities/ticket-update.entity';
import { TicketUpdateRepository } from '../ticket-updates/ticket-update.repository';
import { User } from '../user/entities/user.entity';
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
    ) {
        super(ticketRepository);
    }

    async findMany(user: User, options?: QueryOptions<Ticket>) {
        const filters = {
            ...options,
            relations: ['requester', 'targetUser', 'department'],
            order: { createdAt: 'DESC' } as any,
        };
        return super.findMany(user, filters);
    }

    async findById(user: User, customId: string): Promise<Ticket> {
        return this.findOne(user, {
            where: { customId },
            relations: ['requester', 'targetUser', 'department'],
            order: { createdAt: 'DESC' } as any,
        });
    }

    async findBy(user: User, options?: QueryOptions<Ticket>): Promise<PaginatedResponse<Ticket>> {
        const queryOptions = {
            ...options,
            where: this.buildQueryWhere(options.where),
            relations: ['requester', 'targetUser', 'department'],
            order: { createdAt: 'DESC' } as any,
        };

        return super.findMany(user, queryOptions);
    }

    private buildQueryWhere(where: FindOptionsWhere<Ticket>) {
        const queryWhere: any = { ...where };

        if (where.name) {
            queryWhere.name = ILike(`%${where.name}%`);
        }

        return queryWhere;
    }

    async create(user: User, ticketDto: CreateTicketDto) {
        const requester = await this.userRepository.findOne({
            where: { id: ticketDto.requesterId, tenantId: user.tenantId },
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
                .where('ticket.tenantId = :tenantId', { tenantId: user.tenantId })
                .orderBy('ticket.id', 'DESC')
                .setLock('pessimistic_write')
                .getOne();

            const tenant = await this.tenantRepository.findOne({
                where: { id: user.tenantId },
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
                ...ticketDto,
                customId,
                tenantId: user.tenantId,
            });

            createdTicket = await manager.save(ticket);

            await manager.save(
                this.ticketUpdateRepository.create({
                    tenantId: user.tenantId,
                    ticketId: createdTicket.id,
                    ticketCustomId: createdTicket.customId,
                    performedById: requester.id,
                    action: TicketActionType.Creation,
                    toStatus: TicketStatus.Pending,
                    description: '<p><span>user</span> criou este ticket.</p>',
                }),
            );

            await manager.save(
                this.notificationRepository.create({
                    tenantId: user.tenantId,
                    type: NotificationType.Open,
                    message: `<p>Novo ticket criado por <span>user</span>.</p>`,
                    createdById: requester.id,
                    targetUserId: ticketDto.targetUserId,
                    resourceId: createdTicket.id,
                    resourceCustomId: createdTicket.customId,
                }),
            );
        });

        //Uncomment when ready to use SSE
        // this.notificationService.sendNotification(ticket.targetUserId, {
        //     type: NotificationType.StatusUpdated,
        //     message: `Novo ticket criado por ${requester.firstName} ${requester.lastName}.`,
        //     resourceId: ticketResponse.id,
        // });

        return createdTicket;
    }

    async updateTicket(user: User, customId: string, ticketDto: UpdateTicketDto) {
        const ticketResponse = await this.findById(user, customId);

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        if (user.id !== ticketResponse.requester.id) {
            throw new CustomForbiddenException({
                message: 'User not allowed to update this ticket.',
                code: 'user-not-allowed-to-update-ticket',
            });
        }

        await this.repository.update(ticketResponse.id,  ticketDto);

        await this.ticketUpdateRepository.save({
            tenantId: user.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: user.id,
            action: TicketActionType.Update,
            fromStatus: ticketResponse.status as TicketStatus,
            toStatus: ticketResponse.status as TicketStatus,
            description: '<p><span>user</span> atualizou este ticket.</p>',
        });

        await this.notificationRepository.save({
            tenantId: user.tenantId,
            type: NotificationType.TicketUpdate,
            message: '<p><span>user</span> atualizou o ticket <span>resource</span>.</p>',
            createdById: user.id,
            targetUserId: ticketResponse.requester.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
        });

        return ticketResponse;
    }

    async updateStatus(user: User, customId: string, ticket: UpdateTicketStatusDto) {
        // await this.update(user, customId, ticket);
        const ticketResponse = await this.findById(user, customId);

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        await this.repository.update(ticketResponse.id,  ticket);

        if (ticket.status === TicketStatus.AwaitingVerification) {
            await this.ticketUpdateRepository.save({
                tenantId: user.tenantId,
                ticketId: ticketResponse.id,
                ticketCustomId: ticketResponse.customId,
                performedById: ticketResponse.targetUser.id,
                action: TicketActionType.StatusUpdate,
                fromStatus: TicketStatus.InProgress,
                toStatus: TicketStatus.AwaitingVerification,
                description: '<p><span>user</span> enviou este ticket para verificação.</p>',
            });

            await this.notificationRepository.save({
                tenantId: user.tenantId,
                type: NotificationType.StatusUpdate,
                message:
                    '<p><span>user</span> enviou o ticket <span>resource</span> para verificação.</p>',
                createdById: ticketResponse.targetUser.id,
                targetUserId: ticketResponse.requester.id,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            });

            // this.notificationService.sendNotification(ticketResponse.requester.id, {
            //     type: NotificationType.StatusUpdated,
            //     message: `${ticketResponse.targetUser.firstName} ${ticketResponse.targetUser.lastName} enviou o ticket #${ticketResponse.id} para verificação.`,
            //     resourceId: ticketResponse.id,
            // });
        } else if (ticket.status === TicketStatus.Returned) {
            await this.ticketUpdateRepository.save({
                tenantId: user.tenantId,
                ticketId: ticketResponse.id,
                ticketCustomId: ticketResponse.customId,
                performedById: ticketResponse.requester.id,
                action: TicketActionType.StatusUpdate,
                fromStatus: TicketStatus.UnderVerification,
                toStatus: TicketStatus.Returned,
                description: '<p><span>user</span> solicitou uma correção neste ticket.</p>',
            });

            await this.notificationRepository.save({
                tenantId: user.tenantId,
                type: NotificationType.StatusUpdate,
                message:
                    '<p><span>user</span> solicitou uma correção no ticket <span>resource</span>.</p>',
                createdById: ticketResponse.requester.id,
                targetUserId: ticketResponse.targetUser.id,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            });

            // this.notificationService.sendNotification(ticketResponse.targetUser.id, {
            //     type: NotificationType.StatusUpdated,
            //     message: `${ticketResponse.requester.firstName} ${ticketResponse.requester.lastName} solicitou uma correção no ticket #${ticketResponse.id}.`,
            //     resourceId: ticketResponse.id,
            // });
        }

        return {
            message: 'Successfully updated!',
            ticketData: ticketResponse,
        };
    }

        // protected async update(user: User, id: number, data: QueryDeepPartialEntity<T>) {
    //     // if (!user.isAdmin) {
    //     //   const existing = await this.repository.findOne({ where: { id, tenantId: user.tenantId } as any });
    //     //   if (!existing) throw new Error('Unauthorized or not found');
    //     // }

    //     const existing = await this.repository.findOne({
    //         where: { id, tenantId: user.tenantId } as any,
    //     });
    //     if (!existing) throw new Error('Unauthorized or not found');

    //     return this.repository.update(id, data);
    // }

    async accept(user: User, customId: string) {
        const ticketResponse = await this.findById(user, customId);

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        await this.repository.update(ticketResponse.id,  {
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

        await this.ticketUpdateRepository.save({
            tenantId: user.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: targetUser.id,
            action: TicketActionType.StatusUpdate,
            fromStatus: TicketStatus.Pending,
            toStatus: TicketStatus.InProgress,
            description: '<p><span>user</span> aceitou este ticket.</p>',
        });

        await this.notificationRepository.save({
            tenantId: user.tenantId,
            type: NotificationType.StatusUpdate,
            message: '<p><span>user</span> aceitou o ticket <span>resource</span>.</p>',
            createdById: targetUser.id,
            targetUserId: requester.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
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

    async approve(user: User, customId: string) {
        const ticketResponse = await this.findById(user, customId);

        const { targetUser, requester } = ticketResponse;

        await this.repository.update(ticketResponse.id,  {
            status: TicketStatus.Completed,
            completedAt: new Date().toISOString(),
        });

        // await super.update(user, customId, {
        //     status: TicketStatus.Completed,
        //     completedAt: new Date().toISOString(),
        // });

        await this.ticketUpdateRepository.save({
            tenantId: user.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: requester.id,
            action: TicketActionType.Completion,
            fromStatus: TicketStatus.UnderVerification,
            toStatus: TicketStatus.Completed,
            description: '<p><span>user</span> aprovou este ticket.</p>',
        });

        await this.notificationRepository.save({
            tenantId: user.tenantId,
            type: NotificationType.StatusUpdate,
            message: '<p><span>user</span> aprovou o ticket <span>resource</span>.</p>',
            createdById: requester.id,
            targetUserId: targetUser.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
        });

        // this.notificationService.sendNotification(targetUser.id, {
        //     type: NotificationType.StatusUpdated,
        //     message: `${requester.firstName} ${requester.lastName} aprovou o ticket #${ticketResponse.id}.`,
        //     resourceId: ticketResponse.id,
        // });

        return {
            message: 'Ticket approved!',
            ticketId: customId,
        };
    }

    async cancel(user: User, customId: string) {
        const ticketResponse = await this.findById(user, customId);
        const { targetUser, requester } = ticketResponse;

        if (user.id !== requester.id) {
            throw new CustomForbiddenException({
                message: 'User not allowed to cancel this ticket.',
                code: 'user-not-allowed-to-cancel-ticket',
            });
        }

        await this.repository.update(ticketResponse.id, {
            status: TicketStatus.Canceled,
            canceledAt: new Date(),
        });

        await this.ticketUpdateRepository.save({
            tenantId: user.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: requester.id,
            action: TicketActionType.Cancellation,
            fromStatus: ticketResponse.status as TicketStatus,
            toStatus: TicketStatus.Canceled,
            description: '<p><span>user</span> cancelou este ticket.</p>',
        });

        await this.notificationRepository.save({
            tenantId: user.tenantId,
            type: NotificationType.Cancellation,
            message: '<p><span>user</span> cancelou o ticket <span>{{resource}}</span>.</p>',
            createdById: requester.id,
            targetUserId: targetUser.id,
            resourceId: ticketResponse.id,
            resourceCustomId: ticketResponse.customId,
        });

        return {
            message: 'Ticket successfully canceled!',
            ticketId: customId,
        };
    }

    async deleteTicket(user: User, customId: string) {
        try {
            const entity = await this.repository.findOne({
                where: { customId, tenantId: user.tenantId } as any,
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
}
