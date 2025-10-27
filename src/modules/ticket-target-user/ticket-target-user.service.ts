import { Injectable } from '@nestjs/common';
import { TicketTargetUser } from './entities/ticket-target-user.entity';
import { TicketTargetUserRepository } from './ticket-target-user.repository';

@Injectable()
export class TicketTargetUserService {
    constructor(private readonly ticketTargetUserRepository: TicketTargetUserRepository) {}

    async createMany(
        ticketId: number,
        userIds: number[],
        tenantId: number,
    ): Promise<TicketTargetUser[]> {
        const ticketTargetUsers = userIds.map((userId, index) => {
            const ticketTargetUser = this.ticketTargetUserRepository.create({
                ticketId,
                userId,
                order: index + 1,
                tenantId,
            });
            return ticketTargetUser;
        });

        return this.ticketTargetUserRepository.save(ticketTargetUsers);
    }

    async findByTicketId(ticketId: number, tenantId: number): Promise<TicketTargetUser[]> {
        return this.ticketTargetUserRepository.find({
            where: { ticketId, tenantId },
            order: { order: 'ASC' },
            relations: ['user'],
        });
    }

    async updateOrder(
        ticketId: number,
        userIds: number[],
        tenantId: number,
    ): Promise<TicketTargetUser[]> {
        // Delete existing target users for this ticket
        await this.ticketTargetUserRepository.delete({ ticketId, tenantId });

        // Create new ones with updated order
        return this.createMany(ticketId, userIds, tenantId);
    }

    async deleteByTicketId(ticketId: number, tenantId: number): Promise<void> {
        await this.ticketTargetUserRepository.delete({ ticketId, tenantId });
    }
}
