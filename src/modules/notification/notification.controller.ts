import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll() {
        return this.notificationService.findAll();
    }

    @Get('target-user/:id')
    @UseGuards(AuthGuard('jwt'))
    async findByTargetUser(@Param('id', ParseIntPipe) id: number) {
        return this.notificationService.findBy({ targetUserId: id });
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
