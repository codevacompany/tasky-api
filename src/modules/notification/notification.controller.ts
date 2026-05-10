import {
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
    Sse,
    MessageEvent,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Notification>,
    ) {
        return this.notificationService.findMany(accessProfile, options);
    }

    @UseGuards(JwtAuthGuard)
    @Get('target-user/:id')
    async findByTargetUser(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
        @GetQueryOptions() options: QueryOptions<Notification>,
    ) {
        options.where.targetUserId = id;
        return this.notificationService.findByTargetUser(accessProfile, options);
    }

    @UseGuards(JwtAuthGuard)
    @Post('mark-as-read')
    async markAllAsRead(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.notificationService.markAllAsRead(accessProfile);
    }

    @UseGuards(JwtAuthGuard)
    @Post('mark-as-seen')
    async markAsSeen(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.notificationService.markAsSeen(accessProfile);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/mark-as-read')
    async markAsRead(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.notificationService.markAsRead(accessProfile, id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('unread/count')
    async getUnreadCount(@GetAccessProfile() accessProfile: AccessProfile) {
        return { count: await this.notificationService.countUnreadByUser(accessProfile) };
    }

    /**
     * Delete notification by UUID (public-facing endpoint)
     */
    @UseGuards(JwtAuthGuard)
    @Delete(':uuid')
    async delete(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ) {
        await this.notificationService.deleteByUuid(accessProfile, uuid);
        return { message: 'Successfully deleted!' };
    }

    @UseGuards(JwtAuthGuard)
    @Post('stream-ticket')
    async getStreamTicket(@GetAccessProfile() accessProfile: AccessProfile) {
        return {
            streamTicket: await this.notificationService.createStreamTicket(accessProfile.userId),
        };
    }

    @Sse('stream')
    stream(
        @Query('streamTicket') streamTicket?: string,
        @GetAccessProfile() accessProfile?: AccessProfile,
    ): Observable<MessageEvent> {
        // Handle async ticket validation using RxJS
        if (streamTicket) {
            return from(this.notificationService.validateStreamTicket(streamTicket)).pipe(
                switchMap((ticketUserId) => {
                    const userId = ticketUserId || accessProfile?.userId;

                    if (!userId) {
                        return new Observable<MessageEvent>();
                    }

                    const stream = this.notificationService.getNotificationStream(userId);
                    return stream;
                }),
            );
        }

        // No stream ticket, use accessProfile userId directly
        const userId = accessProfile?.userId;
        if (!userId) {
            return new Observable<MessageEvent>();
        }

        const stream = this.notificationService.getNotificationStream(userId);
        return stream;
    }
}
