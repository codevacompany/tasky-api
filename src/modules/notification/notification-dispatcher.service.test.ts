import { NotificationDispatcher } from './notification-dispatcher.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { EmailService } from '../../shared/services/email/email.service';
import { NotificationEvent } from './constants/notification-events';
import { NotificationType } from './entities/notification.entity';

describe('NotificationDispatcher', () => {
    let dispatcher: NotificationDispatcher;
    let notificationPreferenceService: jest.Mocked<NotificationPreferenceService>;
    let notificationRepository: jest.Mocked<NotificationRepository>;
    let notificationService: jest.Mocked<NotificationService>;
    let emailService: jest.Mocked<EmailService>;

    beforeEach(() => {
        notificationPreferenceService = {
            isInAppEnabled: jest.fn().mockResolvedValue(true),
            isEmailEnabled: jest.fn().mockResolvedValue(true),
        } as unknown as jest.Mocked<NotificationPreferenceService>;

        notificationRepository = {
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn().mockImplementation(async (data) => ({ id: 1, ...data })),
        } as unknown as jest.Mocked<NotificationRepository>;

        notificationService = {
            emitFromEntity: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<NotificationService>;

        emailService = {
            sendMail: jest.fn().mockResolvedValue(undefined),
            compileTemplate: jest.fn().mockReturnValue('<html></html>'),
        } as unknown as jest.Mocked<EmailService>;

        dispatcher = new NotificationDispatcher(
            notificationPreferenceService,
            notificationRepository,
            notificationService,
            emailService,
        );
    });

    it('skips in-app persistence when preference is disabled', async () => {
        notificationPreferenceService.isInAppEnabled.mockResolvedValue(false);
        notificationPreferenceService.isEmailEnabled.mockResolvedValue(true);

        const result = await dispatcher.notify({
            tenantId: 1,
            targetUserId: 2,
            event: NotificationEvent.TICKET_ACCEPTED,
            type: NotificationType.StatusUpdate,
            message: '<p>test</p>',
            email: {
                subject: 'Subject',
                htmlMessage: 'Body',
                to: 'user@example.com',
            },
        });

        expect(result).toBeNull();
        expect(notificationRepository.save).not.toHaveBeenCalled();
        expect(emailService.sendMail).toHaveBeenCalled();
    });

    it('skips email when preference is disabled but still sends in-app', async () => {
        notificationPreferenceService.isEmailEnabled.mockResolvedValue(false);

        const result = await dispatcher.notify({
            tenantId: 1,
            targetUserId: 2,
            event: NotificationEvent.TICKET_ACCEPTED,
            type: NotificationType.StatusUpdate,
            message: '<p>test</p>',
            email: {
                subject: 'Subject',
                htmlMessage: 'Body',
                to: 'user@example.com',
            },
        });

        expect(result).not.toBeNull();
        expect(notificationService.emitFromEntity).toHaveBeenCalled();
        expect(emailService.sendMail).not.toHaveBeenCalled();
    });
});
