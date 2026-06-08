import { Injectable } from '@nestjs/common';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    NotificationPreferencesPayload,
    UserPreference,
} from './entities/user-preference.entity';
import { UserPreferenceRepository } from './user-preference.repository';

@Injectable()
export class UserPreferenceService {
    constructor(private readonly userPreferenceRepository: UserPreferenceRepository) {}

    async getOrCreate(userId: number, tenantId: number): Promise<UserPreference> {
        const existing = await this.userPreferenceRepository.findOne({
            where: { userId, tenantId },
        });

        if (existing) {
            return existing;
        }

        return this.userPreferenceRepository.save(
            this.userPreferenceRepository.create({
                userId,
                tenantId,
                notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
            }),
        );
    }

    getNotificationPreferences(preference: UserPreference): NotificationPreferencesPayload {
        return {
            emailEnabled: preference.notifications?.emailEnabled ?? true,
            disabledInAppEvents: preference.notifications?.disabledInAppEvents ?? [],
            disabledEmailEvents: preference.notifications?.disabledEmailEvents ?? [],
        };
    }

    async updateNotificationPreferences(
        userId: number,
        tenantId: number,
        notifications: NotificationPreferencesPayload,
    ): Promise<UserPreference> {
        const preference = await this.getOrCreate(userId, tenantId);
        preference.notifications = notifications;
        return this.userPreferenceRepository.save(preference);
    }
}
