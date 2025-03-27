import { Injectable } from '@nestjs/common';
import { CreateTicketUpdateDto } from './dtos/create-ticket-update.dto';
import { UpdateTicketUpdateDto } from './dtos/update-ticket-update.dto';
import { TicketUpdate } from './entities/ticket-update.entity';
import { TicketUpdateRepository } from './ticket-update.repository';

@Injectable()
export class TicketUpdateService {
    constructor(private ticketUpdateRepository: TicketUpdateRepository) {}

    async findAll(): Promise<TicketUpdate[]> {
        return await this.ticketUpdateRepository.find({ relations: ['user'] });
    }

    async findById(id: number): Promise<TicketUpdate> {
        return await this.ticketUpdateRepository.findOne({
            where: { id },
            relations: ['user'],
        });
    }

    async findBy(where: Partial<TicketUpdate>): Promise<TicketUpdate[]> {
        return await this.ticketUpdateRepository.find({ where, relations: ['user'] });
    }

    async create(ticketUpdate: CreateTicketUpdateDto) {
        await this.ticketUpdateRepository.save(ticketUpdate);
    }

    async update(id: number, ticketUpdate: UpdateTicketUpdateDto) {
        await this.ticketUpdateRepository.update(id, ticketUpdate);

        return {
            message: 'Successfully updated!',
            ticketUpdateId: id,
        };
    }
}
