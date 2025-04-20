import { Injectable } from '@nestjs/common';
import { AccessProfile } from '../../shared/common/access-profile';
import { CreateTicketUpdateDto } from './dtos/create-ticket-update.dto';
import { TicketUpdate } from './entities/ticket-update.entity';
import { TicketUpdateRepository } from './ticket-update.repository';

@Injectable()
export class TicketUpdateService {
    constructor(private readonly ticketUpdateRepository: TicketUpdateRepository) {}

    async findByTicketId(
        accessProfile: AccessProfile,
        ticketCustomId: string,
    ): Promise<TicketUpdate[]> {
        return await this.ticketUpdateRepository.find({
            where: {
                ticketCustomId,
                tenantId: accessProfile.tenantId,
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
