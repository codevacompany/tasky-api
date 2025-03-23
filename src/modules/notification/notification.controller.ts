import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    async findAll() {
        return this.notificationService.findAll();
    }

    @Post()
    async create(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationService.create(createNotificationDto);
    }

    @Put(':id')
    async update(@Param('id') id: number, @Body() updateNotificationDto: UpdateNotificationDto) {
        return this.notificationService.update(id, updateNotificationDto);
    }

    @Post(':id/mark-as-read')
    async markAsRead(@Param('id') id: number) {
        return this.notificationService.markAsRead(id);
    }
}
