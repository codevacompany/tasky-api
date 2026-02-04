import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { Notification } from './entities/notification.entity';
import { NotificationRepository } from './notification.repository';
import { RedisService } from '../../shared/redis/redis.service';
import { ConfigService } from '@nestjs/config';

// Use environment-specific channel to prevent cross-environment message leakage
const getSSEChannel = (env?: string): string => {
    const envSuffix = env === 'production' ? 'prod' : 'dev';
    return `tasky:sse:notifications:${envSuffix}`;
};

@Injectable()
export class NotificationService
    extends TenantBoundBaseService<Notification>
    implements OnModuleInit
{
    private readonly logger = new Logger(NotificationService.name);
    private readonly sseChannel: string;

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
    ) {
        super(notificationRepository);
        // Use environment-specific channel to prevent cross-environment message leakage
        const nodeEnv = this.configService.get<string>('NODE_ENV', 'dev');
        this.sseChannel = getSSEChannel(nodeEnv);
    }

    async onModuleInit() {
        await this.redisService.subscribe(this.sseChannel, (message) => {
            this.handleRedisMessage(message);
        });
    }

    private handleRedisMessage(message: any) {
        const { data, targetUserId } = message;

        this.logger.debug(`[Redis] Mensagem recebida para o usuário ${targetUserId}`);

        if (Array.isArray(targetUserId)) {
            for (const id of targetUserId) {
                this.emitToLocalStream(id, data);
            }
            return;
        }

        // Single user notification
        if (targetUserId) {
            this.emitToLocalStream(targetUserId, data);
        }
    }

    private emitToLocalStream(userId: number, data: any) {
        const stream = this.notificationStreams.get(userId);
        if (stream) {
            // Emit the data object - the Observable pipe will format it as MessageEvent
            stream.next({ data });
        }
    }

    private notificationStreams = new Map<number, Subject<any>>();
    private streamTickets = new Map<string, { userId: number; expiresAt: number }>();
    private readonly TICKET_PREFIX = 'tasky:sse:ticket:';

    async createStreamTicket(userId: number): Promise<string> {
        const ticket = uuidv4();

        // Ticket valid for 5 minutes to allow for reconnections
        // EventSource may reconnect automatically, so we need a longer window
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        const ticketData = { userId, expiresAt };

        // Store in local Map for fast access
        this.streamTickets.set(ticket, ticketData);

        // Also store in Redis for cross-instance access (cluster mode)
        if (this.redisService.redisEnabled && this.redisService.connected) {
            try {
                const redisKey = `${this.TICKET_PREFIX}${ticket}`;
                await this.redisService.publisher.setex(
                    redisKey,
                    300, // 5 minutes in seconds
                    JSON.stringify(ticketData),
                );
            } catch (error) {
                // Silent fail
            }
        }

        // Cleanup expired tickets after expiration
        setTimeout(() => {
            const existingTicket = this.streamTickets.get(ticket);
            if (existingTicket && Date.now() > existingTicket.expiresAt) {
                this.streamTickets.delete(ticket);
            }
        }, 5 * 60 * 1000);

        return ticket;
    }

    async validateStreamTicket(streamTicket: string): Promise<number | null> {
        // First check local Map
        let ticketData = this.streamTickets.get(streamTicket);

        // If not found locally and Redis is enabled, check Redis (for cross-instance access)
        if (!ticketData && this.redisService.redisEnabled && this.redisService.connected) {
            try {
                const redisKey = `${this.TICKET_PREFIX}${streamTicket}`;
                const redisData = await this.redisService.publisher.get(redisKey);
                if (redisData) {
                    ticketData = JSON.parse(redisData);
                    // Cache it locally for faster future access
                    this.streamTickets.set(streamTicket, ticketData);
                }
            } catch (error) {
                // Silent fail
            }
        }

        if (!ticketData) {
            return null;
        }

        if (Date.now() > ticketData.expiresAt) {
            this.streamTickets.delete(streamTicket);
            // Also remove from Redis
            if (this.redisService.redisEnabled && this.redisService.connected) {
                try {
                    await this.redisService.publisher.del(`${this.TICKET_PREFIX}${streamTicket}`);
                } catch (error) {
                    // Silent fail
                }
            }
            return null;
        }

        // Ticket is valid - don't delete it immediately to allow reconnections
        // It will be cleaned up when it expires
        return ticketData.userId;
    }

    getNotificationStream(userId: number): Observable<any> {
        // Check if stream already exists - if so, complete it first to clean up
        if (this.notificationStreams.has(userId)) {
            const oldStream = this.notificationStreams.get(userId);
            oldStream.complete();
            this.notificationStreams.delete(userId);
        }

        // Create new stream
        const stream = new Subject<any>();
        this.notificationStreams.set(userId, stream);

        return stream.asObservable().pipe(
            map((event: any) => ({
                data: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
            })),
            finalize(() => {
                // Cleanup when client disconnects
                this.notificationStreams.delete(userId);
            }),
        );
    }

    async pushNotification(
        accessProfile: AccessProfile,
        notificationData: Partial<Notification>,
    ): Promise<Notification> {
        const notification = await this.save(accessProfile, notificationData);
        await this.emitFromEntity(notification);
        return notification;
    }

    async countUnread(tenantId: number, targetUserId: number): Promise<number> {
        return await this.notificationRepository.count({
            where: {
                tenantId,
                targetUserId,
                read: false,
            },
        });
    }

    async emitFromEntity(notification: Notification) {
        const unreadCount = await this.countUnread(
            notification.tenantId,
            notification.targetUserId,
        );

        const eventData = {
            type: 'notification',
            notification,
            unreadCount,
        };

        // Emit locally
        this.emitToLocalStream(notification.targetUserId, eventData);

        // Publish to Redis for other instances
        await this.redisService.publish(this.sseChannel, {
            targetUserId: notification.targetUserId,
            data: eventData,
        });
    }

    async broadcastTicketUpdate(userIds: number[], ticket: any) {
        const uniqueUserIds = [...new Set(userIds)];
        const eventData = {
            type: 'ticket_update',
            ticket,
        };

        // Emit locally
        for (const userId of uniqueUserIds) {
            this.emitToLocalStream(userId, eventData);
        }

        // Publish to Redis for other instances
        await this.redisService.publish(this.sseChannel, {
            targetUserId: uniqueUserIds,
            data: eventData,
        });
    }

    async emitUnreadCount(tenantId: number, userId: number) {
        const unreadCount = await this.countUnread(tenantId, userId);
        const eventData = {
            unreadCount,
        };

        this.emitToLocalStream(userId, eventData);

        // Publish to Redis for other instances
        await this.redisService.publish(this.sseChannel, {
            targetUserId: userId,
            data: eventData,
        });
    }

    async findMany(
        accessProfile: AccessProfile,
        options?: QueryOptions<Notification>,
    ): Promise<PaginatedResponse<Notification>> {
        return super.findMany(accessProfile, {
            ...options,
            relations: ['createdBy', 'createdBy.department', 'targetUser', 'targetUser.department'],
        });
    }

    async findByTargetUser(
        accessProfile: AccessProfile,
        options?: QueryOptions<Notification>,
    ): Promise<PaginatedResponse<Notification>> {
        return super.findMany(accessProfile, {
            ...options,
            relations: ['createdBy', 'createdBy.department', 'targetUser', 'targetUser.department'],
        });
    }

    async markAsRead(accessProfile: AccessProfile, id: number): Promise<{ message: string }> {
        const notification = await this.findOne(accessProfile, { where: { id } });

        if (!notification) {
            throw new Error('Notification not found');
        }

        notification.read = true;
        await this.notificationRepository.save(notification);

        await this.emitUnreadCount(accessProfile.tenantId, accessProfile.userId);

        return { message: 'Notification marked as read' };
    }

    async markAllAsRead(accessProfile: AccessProfile): Promise<{ message: string }> {
        await this.notificationRepository.update(
            { tenantId: accessProfile.tenantId, targetUserId: accessProfile.userId },
            { read: true },
        );

        await this.emitUnreadCount(accessProfile.tenantId, accessProfile.userId);

        return { message: 'All notifications marked as read' };
    }

    async countUnreadByUser(accessProfile: AccessProfile): Promise<number> {
        return await this.notificationRepository.count({
            where: {
                tenantId: accessProfile.tenantId,
                targetUserId: accessProfile.userId,
                read: false,
            },
        });
    }

    /**
     * Delete notification by UUID (public-facing identifier)
     */
    async deleteByUuid(accessProfile: AccessProfile, uuid: string): Promise<void> {
        await super.deleteByUuid(accessProfile, uuid);
    }

    async delete(accessProfile: AccessProfile, id: number): Promise<void> {
        return super.delete(accessProfile, id);
    }
}
