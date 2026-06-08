import { NotificationPreferenceService } from './notification-preference.service';
import { UserPreferenceService } from '../user-preference/user-preference.service';
import { TenantSubscriptionService } from '../tenant-subscription/tenant-subscription.service';
import { NotificationEvent } from './constants/notification-events';
import { CustomBadRequestException } from '../../shared/exceptions/http-exception';

describe('NotificationPreferenceService', () => {
    let service: NotificationPreferenceService;
    let userPreferenceService: jest.Mocked<UserPreferenceService>;
    let tenantSubscriptionService: jest.Mocked<TenantSubscriptionService>;

    const userId = 1;
    const tenantId = 10;

    beforeEach(() => {
        userPreferenceService = {
            getOrCreate: jest.fn().mockResolvedValue({
                userId,
                tenantId,
                notifications: {
                    emailEnabled: true,
                    disabledInAppEvents: [],
                    disabledEmailEvents: [],
                },
            }),
            getNotificationPreferences: jest.fn().mockReturnValue({
                emailEnabled: true,
                disabledInAppEvents: [],
                disabledEmailEvents: [],
            }),
            updateNotificationPreferences: jest
                .fn()
                .mockImplementation(async (_uid, _tid, notifications) => ({
                    userId,
                    tenantId,
                    notifications,
                })),
        } as unknown as jest.Mocked<UserPreferenceService>;

        tenantSubscriptionService = {
            getTenantPermissions: jest.fn().mockResolvedValue(['email_notifications']),
        } as unknown as jest.Mocked<TenantSubscriptionService>;

        service = new NotificationPreferenceService(
            userPreferenceService,
            tenantSubscriptionService,
        );
    });

    it('returns required in-app events as always enabled', async () => {
        userPreferenceService.getNotificationPreferences.mockReturnValue({
            emailEnabled: true,
            disabledInAppEvents: [NotificationEvent.TICKET_ASSIGNED_TO_ME],
            disabledEmailEvents: [],
        });

        expect(
            await service.isInAppEnabled(userId, tenantId, NotificationEvent.TICKET_ASSIGNED_TO_ME),
        ).toBe(true);
    });

    it('respects optional in-app disabled events', async () => {
        userPreferenceService.getNotificationPreferences.mockReturnValue({
            emailEnabled: true,
            disabledInAppEvents: [NotificationEvent.TICKET_ACCEPTED],
            disabledEmailEvents: [],
        });

        expect(
            await service.isInAppEnabled(userId, tenantId, NotificationEvent.TICKET_ACCEPTED),
        ).toBe(false);
        expect(
            await service.isInAppEnabled(userId, tenantId, NotificationEvent.TICKET_APPROVED),
        ).toBe(true);
    });

    it('blocks email when master toggle is off', async () => {
        userPreferenceService.getNotificationPreferences.mockReturnValue({
            emailEnabled: false,
            disabledInAppEvents: [],
            disabledEmailEvents: [],
        });

        expect(
            await service.isEmailEnabled(userId, tenantId, NotificationEvent.TICKET_ASSIGNED_TO_ME),
        ).toBe(false);
    });

    it('rejects disabling required events with 400', async () => {
        await expect(
            service.updatePreferences(userId, tenantId, {
                disabledInAppEvents: [NotificationEvent.TICKET_ASSIGNED_TO_ME],
            }),
        ).rejects.toBeInstanceOf(CustomBadRequestException);
    });

    it('rejects email disable for non-email events with 400', async () => {
        await expect(
            service.updatePreferences(userId, tenantId, {
                disabledEmailEvents: [NotificationEvent.COMMENT_ON_TICKET],
            }),
        ).rejects.toBeInstanceOf(CustomBadRequestException);
    });
});
