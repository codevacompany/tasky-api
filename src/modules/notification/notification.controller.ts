import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { GetUser } from '../../shared/decorators/get-user.decorator';
import { QueryOptions } from '../../shared/types/http';
import { User } from '../user/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    async findAll(@GetUser() user: User, @GetQueryOptions() options: QueryOptions<Notification>) {
        return this.notificationService.findMany(user, options);
    }

    @Get('target-user/:id')
    async findByTargetUser(@GetUser() user: User, @Param('id', ParseIntPipe) id: number, @GetQueryOptions() options: QueryOptions<Notification>) {
        options.where.targetUserId = id;
        return this.notificationService.findByTargetUser(user, options);
    }

    @Post('mark-as-read')
    async markAllAsRead(@GetUser() user: User) {
        return this.notificationService.markAllAsRead(user);
    }

    @Post(':id/mark-as-read')
    async markAsRead(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
        return this.notificationService.markAsRead(user, id);
    }

    @Get('unread/count')
    async getUnreadCount(@GetUser() user: User) {
        return { count: await this.notificationService.countUnreadByUser(user) };
    }

    @Delete(':id')
    async delete(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
        await this.notificationService.delete(user, id);
        return { message: 'Successfully deleted!' };
    }

    // SSE can be added later when integrated with client
    // @Sse('stream')
    // stream(@GetUser() user: User): Observable<MessageEvent> {
    //     return this.notificationService.getNotificationStream(user.id);
    // }
}
