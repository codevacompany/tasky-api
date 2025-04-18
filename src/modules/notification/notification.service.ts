import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { User } from '../user/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService extends TenantBoundBaseService<Notification> {
    constructor(private readonly notificationRepository: NotificationRepository) {
        super(notificationRepository);
    }

    private notificationStreams = new Map<number, Subject<MessageEvent>>();

    getNotificationStream(userId: number): Observable<MessageEvent> {
        if (!this.notificationStreams.has(userId)) {
            this.notificationStreams.set(userId, new Subject<MessageEvent>());
        }
        return this.notificationStreams.get(userId).asObservable();
    }

    sendNotification(userId: number, notification: any) {
        const stream = this.notificationStreams.get(userId);
        if (stream) {
            stream.next({ data: notification } as MessageEvent);
        }
    }

    async findMany(
        user: User,
        options?: QueryOptions<Notification>,
    ): Promise<PaginatedResponse<Notification>> {
        return super.findMany(user, {
            ...options,
            relations: ['createdBy', 'targetUser'],
        });
    }

    async findByTargetUser(
        user: User,
        options?: QueryOptions<Notification>,
    ): Promise<PaginatedResponse<Notification>> {
        return super.findMany(user, {
            ...options,
            relations: ['createdBy', 'targetUser'],
        });
    }

    async markAsRead(user: User, id: number): Promise<{ message: string }> {
        const notification = await this.findOne(user, { where: { id } });

        if (!notification) {
            throw new Error('Notification not found');
        }

        notification.read = true;
        await this.notificationRepository.save(notification);

        return { message: 'Notification marked as read' };
    }

    async markAllAsRead(user: User): Promise<{ message: string }> {
        await this.notificationRepository.update(
            { tenantId: user.tenantId, targetUserId: user.id },
            { read: true },
        );

        return { message: 'All notifications marked as read' };
    }

    async countUnreadByUser(user: User): Promise<number> {
        return await this.notificationRepository.count({
            where: { tenantId: user.tenantId, targetUserId: user.id, read: false },
        });
    }

    async delete(user: User, id: number): Promise<void> {
        return super.delete(user, id);
    }
}
