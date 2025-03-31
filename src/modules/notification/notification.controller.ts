import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
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

    @Get('target-user/:id')
    async findByTargetUser(@Param('id', ParseIntPipe) id: number) {
        return this.notificationService.findBy({ targetUserId: id });
    }

    @Post()
    async create(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationService.create(createNotificationDto);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateNotificationDto: UpdateNotificationDto,
    ) {
        return this.notificationService.update(id, updateNotificationDto);
    }

    @Post('mark-as-read')
    async markAllAsRead() {
        return this.notificationService.markAllAsRead();
    }

    @Post(':id/mark-as-read')
    async markAsRead(@Param('id', ParseIntPipe) id: number) {
        return this.notificationService.markAsRead(id);
    }
}
