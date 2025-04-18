import { Injectable } from '@nestjs/common';
import { CreateTicketUpdateDto } from './dtos/create-ticket-update.dto';
import { TicketUpdate } from './entities/ticket-update.entity';
import { TicketUpdateRepository } from './ticket-update.repository';
import { User } from '../user/entities/user.entity';

@Injectable()
export class TicketUpdateService {
    constructor(private readonly ticketUpdateRepository: TicketUpdateRepository) {}

    async findByTicketId(user: User, ticketCustomId: string): Promise<TicketUpdate[]> {
        return await this.ticketUpdateRepository.find({
            where: {
                ticketCustomId,
                tenantId: user.tenantId
            },
            relations: ['performedBy'],
        });
    }

    async findBy(where?: Partial<TicketUpdate>): Promise<TicketUpdate[]> {
        return this.ticketUpdateRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async create(ticketUpdate: CreateTicketUpdateDto) {
        console.log(ticketUpdate);
    }
}
