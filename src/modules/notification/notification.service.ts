import { Injectable } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
    constructor(private notificationRepository: NotificationRepository) {}

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
}
