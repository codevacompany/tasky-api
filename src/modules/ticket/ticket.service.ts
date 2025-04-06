import { Injectable } from '@nestjs/common';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { UserRepository } from '../user/user.repository';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketDto } from './dtos/update-department.dto';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketRepository } from './ticket.repository';

@Injectable()
export class TicketService {
    constructor(
        private readonly ticketRepository: TicketRepository,
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
        return await this.ticketRepository.find({
            where,
            relations: ['requester', 'targetUser', 'department'],
        });
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
            message: `Novo ticket criado por ${requester.firstName} ${requester.lastName}`,
            targetUserId: ticket.targetUserId,
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

    async accept(id: number) {
        await this.ticketRepository.update(id, {status: TicketStatus.InProgress, acceptanceDate: new Date().toISOString()});

        return {
            message: 'Ticket accepted!',
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
