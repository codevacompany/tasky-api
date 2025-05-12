import { Injectable } from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomNotFoundException } from '../../shared/exceptions/http-exception';
import { UserRepository } from '../user/user.repository';
import { CreateTicketCancellationReasonDto } from './dtos/create-ticket-cancellation-reason.dto';
import { TicketCancellationReason } from './entities/ticket-cancellation-reason.entity';
import { TicketCancellationReasonRepository } from './ticket-cancellation-reason.repository';

@Injectable()
export class TicketCancellationReasonService extends TenantBoundBaseService<TicketCancellationReason> {
    constructor(
        private readonly ticketCancellationReasonRepository: TicketCancellationReasonRepository,
        private readonly userRepository: UserRepository,
    ) {
        super(ticketCancellationReasonRepository);
    }

    async findAll(accessProfile: AccessProfile): Promise<TicketCancellationReason[]> {
        const options = {
            where: {
                tenantId: accessProfile.tenantId,
            } as FindOptionsWhere<TicketCancellationReason>,
            relations: ['user', 'ticket'],
            order: { createdAt: 'DESC' } as FindOptionsOrder<TicketCancellationReason>,
        };
        return this.ticketCancellationReasonRepository.find(options);
    }

    async findById(accessProfile: AccessProfile, id: number): Promise<TicketCancellationReason> {
        return this.findOne(accessProfile, {
            where: { id },
            relations: ['user', 'ticket'],
        });
    }

    async findByTicketId(
        accessProfile: AccessProfile,
        ticketId: number,
    ): Promise<TicketCancellationReason> {
        return this.findOne(accessProfile, {
            where: { ticketId },
            relations: ['user', 'ticket'],
        });
    }

    async create(
        accessProfile: AccessProfile,
        ticketId: number,
        ticketCustomId: string,
        dto: CreateTicketCancellationReasonDto,
    ): Promise<TicketCancellationReason> {
        const user = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (!user) {
            throw new CustomNotFoundException({
                message: 'User not found',
                code: 'user-not-found',
            });
        }

        const reasonToSave = {
            ticketId,
            ticketCustomId,
            userId: accessProfile.userId,
            reason: dto.reason,
            details: dto.details,
            tenantId: accessProfile.tenantId,
        };

        return this.save(accessProfile, reasonToSave);
    }

    async delete(accessProfile: AccessProfile, id: number) {
        return super.delete(accessProfile, id);
    }
}
