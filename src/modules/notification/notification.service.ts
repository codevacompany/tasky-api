import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService extends TenantBoundBaseService<Notification> {
    constructor(private readonly notificationRepository: NotificationRepository) {
        super(notificationRepository);
    }

    private notificationStreams = new Map<number, Subject<any>>();
    private streamTickets = new Map<string, { userId: number; expiresAt: number }>();

    createStreamTicket(userId: number): string {
        const ticket = uuidv4();

        const expiresAt = Date.now() + 60 * 1000;
        this.streamTickets.set(ticket, { userId, expiresAt });

        // Cleanup expired tickets occasionally or for this specific user
        setTimeout(() => this.streamTickets.delete(ticket), 60 * 1000);

        return ticket;
    }

    validateStreamTicket(streamTicket: string): number | null {
        const ticketData = this.streamTickets.get(streamTicket);

        if (!ticketData) return null;

        if (Date.now() > ticketData.expiresAt) {
            this.streamTickets.delete(streamTicket);
            return null;
        }

        // Ticket used, delete it (One-Time Token)
        this.streamTickets.delete(streamTicket);
        return ticketData.userId;
    }

    getNotificationStream(userId: number): Observable<any> {
        if (!this.notificationStreams.has(userId)) {
            this.notificationStreams.set(userId, new Subject<any>());
        }
        return this.notificationStreams.get(userId).asObservable();
    }

    async pushNotification(
        accessProfile: AccessProfile,
        notificationData: Partial<Notification>,
    ): Promise<Notification> {
        const notification = await this.save(accessProfile, notificationData);
        await this.emitFromEntity(notification);
        return notification;
    }

    async countUnread(tenantId: number, targetUserId: number): Promise<number> {
        return await this.notificationRepository.count({
            where: {
                tenantId,
                targetUserId,
                read: false,
            },
        });
    }

    async emitFromEntity(notification: Notification) {
        const stream = this.notificationStreams.get(notification.targetUserId);
        if (stream) {
            const unreadCount = await this.countUnread(
                notification.tenantId,
                notification.targetUserId,
            );
            stream.next({
                data: {
                    ...notification,
                    unreadCount,
                },
            });
        }
    }

    async emitUnreadCount(tenantId: number, userId: number) {
        const stream = this.notificationStreams.get(userId);
        if (stream) {
            const unreadCount = await this.countUnread(tenantId, userId);
            stream.next({
                data: {
                    unreadCount,
                },
            });
        }
    }

    async findMany(
        accessProfile: AccessProfile,
        options?: QueryOptions<Notification>,
    ): Promise<PaginatedResponse<Notification>> {
        return super.findMany(accessProfile, {
            ...options,
            relations: ['createdBy', 'createdBy.department', 'targetUser', 'targetUser.department'],
        });
    }

    async findByTargetUser(
        accessProfile: AccessProfile,
        options?: QueryOptions<Notification>,
    ): Promise<PaginatedResponse<Notification>> {
        return super.findMany(accessProfile, {
            ...options,
            relations: ['createdBy', 'createdBy.department', 'targetUser', 'targetUser.department'],
        });
    }

    async markAsRead(accessProfile: AccessProfile, id: number): Promise<{ message: string }> {
        const notification = await this.findOne(accessProfile, { where: { id } });

        if (!notification) {
            throw new Error('Notification not found');
        }

        notification.read = true;
        await this.notificationRepository.save(notification);

        await this.emitUnreadCount(accessProfile.tenantId, accessProfile.userId);

        return { message: 'Notification marked as read' };
    }

    async markAllAsRead(accessProfile: AccessProfile): Promise<{ message: string }> {
        await this.notificationRepository.update(
            { tenantId: accessProfile.tenantId, targetUserId: accessProfile.userId },
            { read: true },
        );

        await this.emitUnreadCount(accessProfile.tenantId, accessProfile.userId);

        return { message: 'All notifications marked as read' };
    }

    async countUnreadByUser(accessProfile: AccessProfile): Promise<number> {
        return await this.notificationRepository.count({
            where: {
                tenantId: accessProfile.tenantId,
                targetUserId: accessProfile.userId,
                read: false,
            },
        });
    }

    /**
     * Delete notification by UUID (public-facing identifier)
     */
    async deleteByUuid(accessProfile: AccessProfile, uuid: string): Promise<void> {
        await super.deleteByUuid(accessProfile, uuid);
    }

    async delete(accessProfile: AccessProfile, id: number): Promise<void> {
        return super.delete(accessProfile, id);
    }
}
