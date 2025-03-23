import { Injectable } from '@nestjs/common';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketDto } from './dtos/update-department.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketRepository } from './ticket.repository';

@Injectable()
export class TicketService {
    constructor(private ticketRepository: TicketRepository) {}

    async findAll(): Promise<Ticket[]> {
        return await this.ticketRepository.find();
    }

    async findById(id: number): Promise<Ticket> {
        return await this.ticketRepository.findOne({
            where: {
                id,
            },
            relations: ['requester', 'targetUser']
        });
    }

    async findBy(where: Partial<Ticket>): Promise<Ticket[]> {
        return await this.ticketRepository.find({ where });
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

        await this.ticketRepository.save(ticket);
    }

    async update(id: number, ticket: UpdateTicketDto) {
        await this.ticketRepository.update(id, ticket);

        return {
            message: 'Successfully updated!',
            ticketId: id,
        };
    }
}
