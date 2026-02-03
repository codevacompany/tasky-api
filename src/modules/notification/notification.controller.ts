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
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { Observable } from 'rxjs';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async findAll(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Notification>,
    ) {
        return this.notificationService.findMany(accessProfile, options);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('target-user/:id')
    async findByTargetUser(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
        @GetQueryOptions() options: QueryOptions<Notification>,
    ) {
        options.where.targetUserId = id;
        return this.notificationService.findByTargetUser(accessProfile, options);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('mark-as-read')
    async markAllAsRead(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.notificationService.markAllAsRead(accessProfile);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/mark-as-read')
    async markAsRead(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.notificationService.markAsRead(accessProfile, id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('unread/count')
    async getUnreadCount(@GetAccessProfile() accessProfile: AccessProfile) {
        return { count: await this.notificationService.countUnreadByUser(accessProfile) };
    }

    /**
     * Delete notification by UUID (public-facing endpoint)
     */
    @UseGuards(AuthGuard('jwt'))
    @Delete(':uuid')
    async delete(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ) {
        await this.notificationService.deleteByUuid(accessProfile, uuid);
        return { message: 'Successfully deleted!' };
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('stream-ticket')
    async getStreamTicket(@GetAccessProfile() accessProfile: AccessProfile) {
        return { streamTicket: this.notificationService.createStreamTicket(accessProfile.userId) };
    }

    @Sse('stream')
    stream(
        @Query('streamTicket') streamTicket?: string,
        @GetAccessProfile() accessProfile?: AccessProfile,
    ): Observable<MessageEvent> {
        let userId = accessProfile?.userId;

        this.notificationService['logger'].log(
            `[SSE] Tentativa de conexão recebida. streamTicket: ${streamTicket ? 'presente' : 'ausente'}, accessProfile.userId: ${accessProfile?.userId || 'não disponível'}`,
        );

        if (streamTicket) {
            const ticketUserId = this.notificationService.validateStreamTicket(streamTicket);
            this.notificationService['logger'].log(
                `[SSE] Validando streamTicket. Resultado: ${ticketUserId || 'inválido/expirado'}`,
            );
            if (ticketUserId) {
                userId = ticketUserId;
            }
        }

        if (!userId) {
            this.notificationService['logger'].warn(
                '[SSE] Tentativa de conexão sem userId válido. streamTicket e accessProfile.userId ambos ausentes.',
            );
            return new Observable();
        }

        this.notificationService['logger'].log(
            `[SSE] Cliente conectando ao stream para o usuário ${userId}`,
        );
        const stream = this.notificationService.getNotificationStream(userId);
        const activeStreams = Array.from(this.notificationService['notificationStreams'].keys());
        this.notificationService['logger'].log(
            `[SSE] Stream criado para o usuário ${userId}. Total de streams ativos: ${this.notificationService['notificationStreams'].size}. Usuários conectados: [${activeStreams.join(', ')}]`,
        );
        return stream;
    }
}
