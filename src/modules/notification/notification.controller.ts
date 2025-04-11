import { Controller, Get, Param, ParseIntPipe, Post, Sse, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
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

    @Get('unread/count/:userId')
    @UseGuards(AuthGuard('jwt'))
    async getUnreadCount(@Param('userId', ParseIntPipe) userId: number) {
        return { count: await this.notificationService.countUnreadByUserId(userId) };
    }

    @Sse('stream/:userId')
    stream(@Param('userId', ParseIntPipe) userId: number): Observable<MessageEvent> {
        return this.notificationService.getNotificationStream(userId);
    }
}
