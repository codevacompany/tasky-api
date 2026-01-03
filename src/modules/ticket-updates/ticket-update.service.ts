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

    /**
     * Get a lightweight change checksum for efficient polling.
     * Returns the count of ticket updates and the latest update timestamp.
     * Frontend can compare this to detect if any tickets have changed since last poll.
     */
    async getChangeChecksum(
        accessProfile: AccessProfile,
    ): Promise<{ count: number; latestUpdate: Date | null }> {
        const result = await this.ticketUpdateRepository
            .createQueryBuilder('tu')
            .select('COUNT(*)', 'count')
            .addSelect('MAX(tu.createdAt)', 'latestUpdate')
            .where('tu.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .getRawOne();

        return {
            count: parseInt(result.count, 10) || 0,
            latestUpdate: result.latestUpdate ? new Date(result.latestUpdate) : null,
        };
    }

    async create(ticketUpdate: CreateTicketUpdateDto) {
        console.log(ticketUpdate);
    }
}
