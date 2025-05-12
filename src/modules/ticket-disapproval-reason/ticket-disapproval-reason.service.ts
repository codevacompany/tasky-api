import { Injectable } from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomNotFoundException } from '../../shared/exceptions/http-exception';
import { UserRepository } from '../user/user.repository';
import { CreateTicketDisapprovalReasonDto } from './dtos/create-ticket-rejection-reason.dto';
import { TicketDisapprovalReason } from './entities/ticket-disapproval-reason.entity';
import { TicketDisapprovalReasonRepository } from './ticket-disapproval-reason.repository';

@Injectable()
export class TicketDisapprovalReasonService extends TenantBoundBaseService<TicketDisapprovalReason> {
    constructor(
        private readonly ticketDisapprovalReasonRepository: TicketDisapprovalReasonRepository,
        private readonly userRepository: UserRepository,
    ) {
        super(ticketDisapprovalReasonRepository);
    }

    async findAll(accessProfile: AccessProfile): Promise<TicketDisapprovalReason[]> {
        const options = {
            where: {
                tenantId: accessProfile.tenantId,
            } as FindOptionsWhere<TicketDisapprovalReason>,
            relations: ['user', 'ticket'],
            order: { createdAt: 'DESC' } as FindOptionsOrder<TicketDisapprovalReason>,
        };
        return this.ticketDisapprovalReasonRepository.find(options);
    }

    async findById(accessProfile: AccessProfile, id: number): Promise<TicketDisapprovalReason> {
        return this.findOne(accessProfile, {
            where: { id },
            relations: ['user', 'ticket'],
        });
    }

    async findByTicketId(
        accessProfile: AccessProfile,
        ticketId: number,
    ): Promise<TicketDisapprovalReason> {
        return this.findOne(accessProfile, {
            where: { ticketId },
            relations: ['user', 'ticket'],
        });
    }

    async create(
        accessProfile: AccessProfile,
        ticketId: number,
        ticketCustomId: string,
        dto: CreateTicketDisapprovalReasonDto,
    ): Promise<TicketDisapprovalReason> {
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
