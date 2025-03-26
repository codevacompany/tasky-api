import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
    constructor(private notificationRepository: NotificationRepository) {}

    async findAll(): Promise<Notification[]> {
        return await this.notificationRepository.find();
    }

    async create(notification: CreateNotificationDto) {
        await this.notificationRepository.save(notification);
    }

    async update(id: number, notification: UpdateNotificationDto) {
        await this.notificationRepository.update(id, notification);

        return {
            message: 'Successfully updated!',
            notificationId: id,
        };
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
