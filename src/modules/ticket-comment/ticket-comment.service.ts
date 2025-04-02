import { Injectable } from '@nestjs/common';
import { CreateTicketCommentDto } from './dtos/create-ticket-comment.dto';
import { UpdateTicketCommentDto } from './dtos/update-ticket-comment.dto';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCommentRepository } from './ticket-comment.repository';

@Injectable()
export class TicketCommentService {
    constructor(private ticketCommentRepository: TicketCommentRepository) {}

    async findAll(): Promise<TicketComment[]> {
        return await this.ticketCommentRepository.find({ relations: ['user'] });
    }

    async findById(id: number): Promise<TicketComment> {
        return await this.ticketCommentRepository.findOne({
            where: { id },
            relations: ['user'],
        });
    }

    async findBy(where: Partial<TicketComment>): Promise<TicketComment[]> {
        return await this.ticketCommentRepository.find({ where, relations: ['user'] });
    }

    async create(ticketComment: CreateTicketCommentDto) {
        await this.ticketCommentRepository.save(ticketComment);
    }

    async update(id: number, ticketComment: UpdateTicketCommentDto) {
        await this.ticketCommentRepository.update(id, ticketComment);

        return {
            message: 'Successfully updated!',
            ticketUpdateId: id,
        };
    }
}
