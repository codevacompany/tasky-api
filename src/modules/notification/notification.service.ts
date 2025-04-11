import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
    constructor(private notificationRepository: NotificationRepository) {}

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

    async findAll(): Promise<Notification[]> {
        return await this.notificationRepository.find();
    }

    async findBy(where: Partial<Notification>): Promise<Notification[]> {
        return await this.notificationRepository.find({
            where,
            relations: ['createdBy', 'targetUser'],
        });
    }

    async markAsRead(id: number): Promise<{ message: string }> {
        const notification = await this.notificationRepository.findOne({ where: { id } });

        if (!notification) {
            throw new Error('Notification not found');
        }

        notification.read = true;
        await this.notificationRepository.save(notification);

        return {
            message: 'Notification marked as read',
        };
    }

    async markAllAsRead(): Promise<{ message: string }> {
        await this.notificationRepository.update({}, { read: true });

        return {
            message: 'All notifications marked as read',
        };
    }

    async countUnreadByUserId(userId: number): Promise<number> {
        return await this.notificationRepository.count({ where: { targetUserId: userId, read: false } });
    }
}
