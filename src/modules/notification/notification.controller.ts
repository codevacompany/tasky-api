import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    async findAll(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Notification>,
    ) {
        return this.notificationService.findMany(accessProfile, options);
    }

    @Get('target-user/:id')
    async findByTargetUser(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
        @GetQueryOptions() options: QueryOptions<Notification>,
    ) {
        options.where.targetUserId = id;
        return this.notificationService.findByTargetUser(accessProfile, options);
    }

    @Post('mark-as-read')
    async markAllAsRead(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.notificationService.markAllAsRead(accessProfile);
    }

    @Post(':id/mark-as-read')
    async markAsRead(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.notificationService.markAsRead(accessProfile, id);
    }

    @Get('unread/count')
    async getUnreadCount(@GetAccessProfile() accessProfile: AccessProfile) {
        return { count: await this.notificationService.countUnreadByUser(accessProfile) };
    }

    @Delete(':id')
    async delete(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.notificationService.delete(accessProfile, id);
        return { message: 'Successfully deleted!' };
    }

    // SSE can be added later when integrated with client
    // @Sse('stream')
    // stream(@GetAccessProfile() accessProfile: AccessProfile): Observable<MessageEvent> {
    //     return this.notificationService.getNotificationStream(accessProfile.id);
    // }
}
