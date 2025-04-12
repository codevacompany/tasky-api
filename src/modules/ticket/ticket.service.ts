import { Injectable } from '@nestjs/common';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { UserRepository } from '../user/user.repository';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { UpdateTicketDto } from './dtos/update-ticket.dto';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketRepository } from './ticket.repository';
import { ILike } from 'typeorm';

@Injectable()
export class TicketService {
    constructor(
        private readonly ticketRepository: TicketRepository,
        private readonly notificationService: NotificationService,
        private readonly notificationRepository: NotificationRepository,
        private readonly userRepository: UserRepository,
    ) {}

    async findAll(): Promise<Ticket[]> {
        return await this.ticketRepository.find({
            relations: ['requester', 'targetUser', 'department'],
        });
    }

    async findById(id: number): Promise<Ticket> {
        return await this.ticketRepository.findOne({
            where: {
                id,
            },
            relations: ['requester', 'targetUser', 'department'],
        });
    }

    async findBy(where: Partial<Ticket>): Promise<Ticket[]> {
        const query = this.buildQuery(where);

        return await this.ticketRepository.find({
            where: query.where,
            relations: ['requester', 'targetUser', 'department'],
            order: { createdAt: 'DESC' },
        });
    }

    private buildQuery(where: Partial<Ticket>) {
        const queryWhere: any = { ...where };

        if (where.name) {
            queryWhere.name = ILike(`%${where.name}%`);
        }

        return { where: queryWhere };
    }

    async create(ticket: CreateTicketDto) {
        ticket.name = ticket.name.toLowerCase();

        const ticketExists = await this.ticketRepository.findOne({
            where: {
                name: ticket.name,
            },
        });

        if (ticketExists) {
            throw new CustomConflictException({
                code: 'ticket-name-already-registered',
                message: 'This ticket name is already registered',
            });
        }

        const requester = await this.userRepository.findOne({
            where: {
                id: ticket.requesterId,
            },
        });

        const ticketResponse = await this.ticketRepository.save(ticket);

        await this.notificationRepository.save({
            type: NotificationType.Open,
            message: `Novo ticket criado por ${requester.firstName} ${requester.lastName}.`,
            targetUserId: ticket.targetUserId,
            resourceId: ticketResponse.id,
        });

        this.notificationService.sendNotification(ticket.targetUserId, {
            type: NotificationType.StatusUpdated,
            message: `Novo ticket criado por ${requester.firstName} ${requester.lastName}.`,
            resourceId: ticketResponse.id,
        });
    }

    async update(id: number, ticket: UpdateTicketDto) {
        await this.ticketRepository.update(id, ticket);

        return {
            message: 'Successfully updated!',
            ticketId: id,
        };
    }

    async updateStatus(id: number, ticket: UpdateTicketStatusDto) {
        await this.ticketRepository.update(id, ticket);

        const ticketResponse = await this.findById(id);

        if (ticket.status === TicketStatus.AwaitingVerification) {
            await this.notificationRepository.save({
                type: NotificationType.StatusUpdated,
                message: `${ticketResponse.targetUser.firstName} ${ticketResponse.targetUser.lastName} enviou o ticket #${ticketResponse.id} para verificação.`,
                targetUserId: ticketResponse.requester.id,
                resourceId: ticketResponse.id,
            });

            this.notificationService.sendNotification(ticketResponse.requester.id, {
                type: NotificationType.StatusUpdated,
                message: `${ticketResponse.targetUser.firstName} ${ticketResponse.targetUser.lastName} enviou o ticket #${ticketResponse.id} para verificação.`,
                resourceId: ticketResponse.id,
            });
        } else if (ticket.status === TicketStatus.Returned) {
            await this.notificationRepository.save({
                type: NotificationType.StatusUpdated,
                message: `${ticketResponse.requester.firstName} ${ticketResponse.requester.lastName} solicitou uma correção no ticket #${ticketResponse.id}.`,
                targetUserId: ticketResponse.targetUser.id,
                resourceId: ticketResponse.id,
            });

            this.notificationService.sendNotification(ticketResponse.targetUser.id, {
                type: NotificationType.StatusUpdated,
                message: `${ticketResponse.requester.firstName} ${ticketResponse.requester.lastName} solicitou uma correção no ticket #${ticketResponse.id}.`,
                resourceId: ticketResponse.id,
            });
        }

        return {
            message: 'Successfully updated!',
            ticketData: ticketResponse,
        };
    }

    async accept(id: number) {
        await this.ticketRepository.update(id, {
            status: TicketStatus.InProgress,
            acceptedAt: new Date().toISOString(),
        });

        const { targetUser, requester, ...ticketResponse } = await this.findById(id);

        await this.notificationRepository.save({
            type: NotificationType.StatusUpdated,
            message: `${targetUser.firstName} ${targetUser.lastName} aceitou o ticket #${ticketResponse.id}.`,
            targetUserId: requester.id,
            resourceId: ticketResponse.id,
        });

        this.notificationService.sendNotification(requester.id, {
            type: NotificationType.StatusUpdated,
            message: `${targetUser.firstName} ${targetUser.lastName} aceitou o ticket #${ticketResponse.id}.`,
            resourceId: ticketResponse.id,
        });

        return {
            message: 'Ticket accepted!',
            ticketId: id,
        };
    }

    async approve(id: number) {
        await this.ticketRepository.update(id, {
            status: TicketStatus.Completed,
            completedAt: new Date().toISOString(),
        });

        const { targetUser, requester, ...ticketResponse } = await this.findById(id);

        await this.notificationRepository.save({
            type: NotificationType.StatusUpdated,
            message: `${requester.firstName} ${requester.lastName} aprovou o ticket #${ticketResponse.id}.`,
            targetUserId: targetUser.id,
            resourceId: ticketResponse.id,
        });

        this.notificationService.sendNotification(targetUser.id, {
            type: NotificationType.StatusUpdated,
            message: `${requester.firstName} ${requester.lastName} aprovou o ticket #${ticketResponse.id}.`,
            resourceId: ticketResponse.id,
        });

        return {
            message: 'Ticket approved!',
            ticketId: id,
        };
    }

    async delete(id: number) {
        const ticket = await this.ticketRepository.findOne({ where: { id } });

        if (!ticket) {
            throw new CustomConflictException({
                code: 'ticket-not-found',
                message: 'Ticket not found or already deleted',
            });
        }

        await this.ticketRepository.delete(id);

        return {
            message: 'Ticket deleted successfully!',
            ticketId: id,
        };
    }
}
