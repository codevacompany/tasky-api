import { Injectable } from '@nestjs/common';
import { CustomBadRequestException } from '../../shared/exceptions/http-exception';
import { UserSeenFeatureTipRepository } from './user-seen-feature-tip.repository';

const TIP_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i;
const TIP_ID_MAX_LENGTH = 128;

@Injectable()
export class FeatureTipService {
    constructor(private readonly seenTipRepository: UserSeenFeatureTipRepository) {}

    async listSeenTipIds(userId: number): Promise<string[]> {
        const rows = await this.seenTipRepository.find({
            where: { userId },
            select: ['tipId'],
        });
        return rows.map((row) => row.tipId);
    }

    async markSeen(userId: number, tipId: string): Promise<{ tipId: string; seenAt: Date }> {
        const normalized = tipId?.trim();
        if (
            !normalized ||
            normalized.length > TIP_ID_MAX_LENGTH ||
            !TIP_ID_PATTERN.test(normalized)
        ) {
            throw new CustomBadRequestException({
                code: 'invalid-feature-tip-id',
                message: 'Invalid feature tip id',
            });
        }

        const existing = await this.seenTipRepository.findOne({
            where: { userId, tipId: normalized },
        });

        if (existing) {
            return { tipId: existing.tipId, seenAt: existing.seenAt };
        }

        const row = this.seenTipRepository.create({
            userId,
            tipId: normalized,
            seenAt: new Date(),
        });
        const saved = await this.seenTipRepository.save(row);
        return { tipId: saved.tipId, seenAt: saved.seenAt };
    }
}
