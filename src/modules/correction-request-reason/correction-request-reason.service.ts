import { Injectable } from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomNotFoundException } from '../../shared/exceptions/http-exception';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { UserRepository } from '../user/user.repository';
import { CorrectionRequestRepository } from './correction-request-reason.repository';
import { CreateCorrectionRequestDto } from './dtos/create-correction-request-reason.dto';
import { CorrectionRequest } from './entities/correction-request-reason.entity';

@Injectable()
export class CorrectionRequestService extends TenantBoundBaseService<CorrectionRequest> {
    constructor(
        private readonly correctionRequestRepository: CorrectionRequestRepository,
        private readonly userRepository: UserRepository,
        private readonly notificationRepository: NotificationRepository,
    ) {
        super(correctionRequestRepository);
    }

    async findAll(accessProfile: AccessProfile): Promise<CorrectionRequest[]> {
        const options = {
            where: { tenantId: accessProfile.tenantId } as FindOptionsWhere<CorrectionRequest>,
            relations: ['user', 'ticket'],
            order: { createdAt: 'DESC' } as FindOptionsOrder<CorrectionRequest>,
        };
        return this.correctionRequestRepository.find(options);
    }

    async findById(accessProfile: AccessProfile, id: number): Promise<CorrectionRequest> {
        return this.findOne(accessProfile, {
            where: { id },
            relations: ['user', 'ticket'],
        });
    }

    async findByTicketId(
        accessProfile: AccessProfile,
        ticketId: number,
    ): Promise<CorrectionRequest[]> {
        const options = {
            where: {
                tenantId: accessProfile.tenantId,
                ticketId,
            } as FindOptionsWhere<CorrectionRequest>,
            relations: ['user', 'ticket'],
            order: { createdAt: 'DESC' } as FindOptionsOrder<CorrectionRequest>,
        };
        return this.correctionRequestRepository.find(options);
    }

    async create(
        accessProfile: AccessProfile,
        ticketId: number,
        ticketCustomId: string,
        targetUserId: number,
        dto: CreateCorrectionRequestDto,
    ): Promise<CorrectionRequest> {
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

        const savedReason = await this.save(accessProfile, reasonToSave);

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.CorrectionRequest,
            message: `<p><span>user</span> solicitou uma correção no ticket <span>resource</span> por ${dto.reason}.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId,
            resourceId: ticketId,
            resourceCustomId: ticketCustomId,
        });

        return savedReason;
    }

    async delete(accessProfile: AccessProfile, id: number) {
        return super.delete(accessProfile, id);
    }
}
