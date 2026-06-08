import { Injectable } from '@nestjs/common';
import { CustomBadRequestException } from '../../shared/exceptions/http-exception';
import { TenantSubscriptionService } from '../tenant-subscription/tenant-subscription.service';
import { NotificationPreferencesPayload } from '../user-preference/entities/user-preference.entity';
import { UserPreferenceService } from '../user-preference/user-preference.service';
import { UpdateNotificationPreferenceDto } from './dtos/update-notification-preference.dto';
import {
    getNotificationEventDefinition,
    isValidNotificationEvent,
    NotificationEvent,
    NOTIFICATION_EVENT_CATALOG,
} from './constants/notification-events';

export interface NotificationEventPreferenceView {
    event: NotificationEvent;
    label: string;
    description: string;
    group: string;
    groupLabel: string;
    required: boolean;
    supportsEmail: boolean;
    inAppEnabled: boolean;
    emailEnabled: boolean | null;
}

export interface NotificationPreferencesView {
    emailEnabled: boolean;
    tenantEmailAvailable: boolean;
    events: NotificationEventPreferenceView[];
}

@Injectable()
export class NotificationPreferenceService {
    private readonly preferencesCache = new Map<
        number,
        { value: NotificationPreferencesPayload; expiresAt: number }
    >();

    private static readonly CACHE_TTL_MS = 60_000;

    constructor(
        private readonly userPreferenceService: UserPreferenceService,
        private readonly tenantSubscriptionService: TenantSubscriptionService,
    ) {}

    private getCachedPreferences(userId: number): NotificationPreferencesPayload | null {
        const cached = this.preferencesCache.get(userId);
        if (!cached) return null;
        if (cached.expiresAt < Date.now()) {
            this.preferencesCache.delete(userId);
            return null;
        }
        return cached.value;
    }

    private setCachedPreferences(userId: number, preferences: NotificationPreferencesPayload) {
        this.preferencesCache.set(userId, {
            value: preferences,
            expiresAt: Date.now() + NotificationPreferenceService.CACHE_TTL_MS,
        });
    }

    private invalidateCache(userId: number) {
        this.preferencesCache.delete(userId);
    }

    private async loadPreferences(
        userId: number,
        tenantId: number,
    ): Promise<NotificationPreferencesPayload> {
        const cached = this.getCachedPreferences(userId);
        if (cached) return cached;

        const preference = await this.userPreferenceService.getOrCreate(userId, tenantId);
        const notifications = this.userPreferenceService.getNotificationPreferences(preference);
        this.setCachedPreferences(userId, notifications);
        return notifications;
    }

    private assertKnownEvents(events: string[], fieldName: string) {
        for (const event of events) {
            if (!isValidNotificationEvent(event)) {
                throw new CustomBadRequestException({
                    code: 'invalid-notification-preference',
                    message: `Unknown notification event in ${fieldName}: ${event}`,
                });
            }
        }
    }

    private assertNotDisablingRequired(
        events: string[],
        fieldName: 'disabledInAppEvents' | 'disabledEmailEvents',
    ) {
        for (const event of events) {
            const definition = getNotificationEventDefinition(event as NotificationEvent);
            if (definition.required) {
                throw new CustomBadRequestException({
                    code: 'invalid-notification-preference',
                    message: `Cannot disable required notification event: ${event}`,
                });
            }
        }

        if (fieldName === 'disabledEmailEvents') {
            for (const event of events) {
                const definition = getNotificationEventDefinition(event as NotificationEvent);
                if (!definition.supportsEmail) {
                    throw new CustomBadRequestException({
                        code: 'invalid-notification-preference',
                        message: `Event does not support email notifications: ${event}`,
                    });
                }
            }
        }
    }

    private buildEventViews(
        preferences: NotificationPreferencesPayload,
    ): NotificationEventPreferenceView[] {
        return NOTIFICATION_EVENT_CATALOG.map((definition) => ({
            event: definition.event,
            label: definition.label,
            description: definition.description,
            group: definition.group,
            groupLabel: definition.groupLabel,
            required: definition.required,
            supportsEmail: definition.supportsEmail,
            inAppEnabled: definition.required
                ? true
                : !preferences.disabledInAppEvents.includes(definition.event),
            emailEnabled: definition.supportsEmail
                ? definition.required
                    ? true
                    : !preferences.disabledEmailEvents.includes(definition.event)
                : null,
        }));
    }

    async getPreferences(userId: number, tenantId: number): Promise<NotificationPreferencesView> {
        const preferences = await this.loadPreferences(userId, tenantId);
        const tenantEmailAvailable = await this.tenantHasEmailPermission(tenantId);

        return {
            emailEnabled: preferences.emailEnabled,
            tenantEmailAvailable,
            events: this.buildEventViews(preferences),
        };
    }

    async updatePreferences(
        userId: number,
        tenantId: number,
        dto: UpdateNotificationPreferenceDto,
    ): Promise<NotificationPreferencesView> {
        if (
            dto.emailEnabled === undefined &&
            dto.disabledInAppEvents === undefined &&
            dto.disabledEmailEvents === undefined
        ) {
            return this.getPreferences(userId, tenantId);
        }

        const preference = await this.userPreferenceService.getOrCreate(userId, tenantId);
        const current = this.userPreferenceService.getNotificationPreferences(preference);

        if (dto.disabledInAppEvents !== undefined) {
            this.assertKnownEvents(dto.disabledInAppEvents, 'disabledInAppEvents');
            this.assertNotDisablingRequired(dto.disabledInAppEvents, 'disabledInAppEvents');
        }

        if (dto.disabledEmailEvents !== undefined) {
            this.assertKnownEvents(dto.disabledEmailEvents, 'disabledEmailEvents');
            this.assertNotDisablingRequired(dto.disabledEmailEvents, 'disabledEmailEvents');
        }

        const nextPreferences: NotificationPreferencesPayload = {
            emailEnabled: dto.emailEnabled ?? current.emailEnabled,
            disabledInAppEvents:
                dto.disabledInAppEvents !== undefined
                    ? [...new Set(dto.disabledInAppEvents)]
                    : current.disabledInAppEvents,
            disabledEmailEvents:
                dto.disabledEmailEvents !== undefined
                    ? [...new Set(dto.disabledEmailEvents)]
                    : current.disabledEmailEvents,
        };

        await this.userPreferenceService.updateNotificationPreferences(
            userId,
            tenantId,
            nextPreferences,
        );

        this.invalidateCache(userId);
        return this.getPreferences(userId, tenantId);
    }

    async isInAppEnabled(
        userId: number,
        tenantId: number,
        event: NotificationEvent,
    ): Promise<boolean> {
        const definition = getNotificationEventDefinition(event);
        if (definition.required) return true;

        const preferences = await this.loadPreferences(userId, tenantId);
        return !preferences.disabledInAppEvents.includes(event);
    }

    async isEmailEnabled(
        userId: number,
        tenantId: number,
        event: NotificationEvent,
    ): Promise<boolean> {
        const definition = getNotificationEventDefinition(event);
        if (!definition.supportsEmail) return false;

        const tenantEmailAvailable = await this.tenantHasEmailPermission(tenantId);
        if (!tenantEmailAvailable) return false;

        const preferences = await this.loadPreferences(userId, tenantId);
        if (!preferences.emailEnabled) return false;
        if (definition.required) return true;

        return !preferences.disabledEmailEvents.includes(event);
    }

    private async tenantHasEmailPermission(tenantId: number): Promise<boolean> {
        try {
            const permissions = await this.tenantSubscriptionService.getTenantPermissions(tenantId);
            return permissions.includes('email_notifications');
        } catch {
            return false;
        }
    }
}
