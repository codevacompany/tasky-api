import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { EmailService } from '../../shared/services/email/email.service';
import { NotificationEvent } from './constants/notification-events';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

export interface NotifyEmailOptions {
    subject: string;
    htmlMessage: string;
    to: string;
    ticketCustomId?: string;
}

export interface NotifyOptions {
    tenantId: number;
    targetUserId: number;
    event: NotificationEvent;
    type: NotificationType;
    message: string;
    createdById?: number;
    updatedById?: number;
    resourceId?: number;
    resourceCustomId?: string;
    metadata?: Record<string, unknown>;
    email?: NotifyEmailOptions;
    entityManager?: EntityManager;
    deferEmit?: boolean;
}

@Injectable()
export class NotificationDispatcher {
    private readonly logger = new Logger(NotificationDispatcher.name);

    constructor(
        private readonly notificationPreferenceService: NotificationPreferenceService,
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationService: NotificationService,
        private readonly emailService: EmailService,
    ) {}

    async notify(options: NotifyOptions): Promise<Notification | null> {
        const inAppEnabled = await this.notificationPreferenceService.isInAppEnabled(
            options.targetUserId,
            options.tenantId,
            options.event,
        );

        let notification: Notification | null = null;

        if (inAppEnabled) {
            const notificationData = {
                tenantId: options.tenantId,
                type: options.type,
                message: options.message,
                createdById: options.createdById,
                updatedById: options.updatedById ?? options.createdById,
                targetUserId: options.targetUserId,
                resourceId: options.resourceId,
                resourceCustomId: options.resourceCustomId,
                metadata: options.metadata ?? null,
            };

            if (options.entityManager) {
                notification = await options.entityManager.save(
                    Notification,
                    this.notificationRepository.create(notificationData),
                );
            } else {
                notification = await this.notificationRepository.save(
                    this.notificationRepository.create(notificationData),
                );
            }

            if (!options.deferEmit) {
                await this.notificationService.emitFromEntity(notification);
            }
        } else {
            this.logger.debug(
                `Skipped in-app notification for user ${options.targetUserId}, event ${options.event}`,
            );
        }

        if (options.email) {
            const emailEnabled = await this.notificationPreferenceService.isEmailEnabled(
                options.targetUserId,
                options.tenantId,
                options.event,
            );

            if (emailEnabled) {
                const ticketLink = options.email.ticketCustomId
                    ? `${process.env.FRONTEND_URL}/minhas-tarefas?ticket=${options.email.ticketCustomId}`
                    : options.resourceCustomId
                      ? `${process.env.FRONTEND_URL}/minhas-tarefas?ticket=${options.resourceCustomId}`
                      : undefined;

                await this.emailService.sendMail({
                    subject: options.email.subject,
                    html: this.emailService.compileTemplate('ticket-update', {
                        message: options.email.htmlMessage,
                        ticketLink,
                    }),
                    to: options.email.to,
                });
            } else {
                this.logger.debug(
                    `Skipped email notification for user ${options.targetUserId}, event ${options.event}`,
                );
            }
        }

        return notification;
    }
}
