import { Injectable } from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomNotFoundException } from '../../shared/exceptions/http-exception';
import { QueryOptions } from '../../shared/types/http';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { UserRepository } from '../user/user.repository';
import { CreateTicketCommentDto } from './dtos/create-ticket-comment.dto';
import { UpdateTicketCommentDto } from './dtos/update-ticket-comment.dto';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCommentRepository } from './ticket-comment.repository';

@Injectable()
export class TicketCommentService extends TenantBoundBaseService<TicketComment> {
    constructor(
        private readonly ticketCommentRepository: TicketCommentRepository,
        private readonly userRepository: UserRepository,
        private readonly notificationService: NotificationService,
        private readonly notificationRepository: NotificationRepository,
    ) {
        super(ticketCommentRepository);
    }

    async findAll(accessProfile: AccessProfile): Promise<TicketComment[]> {
        const options = {
            where: { tenantId: accessProfile.tenantId } as FindOptionsWhere<TicketComment>,
            relations: ['user'],
            order: { createdAt: 'DESC' } as FindOptionsOrder<TicketComment>,
        };
        return this.ticketCommentRepository.find(options);
    }

    async findById(accessProfile: AccessProfile, id: number): Promise<TicketComment> {
        return this.findOne(accessProfile, {
            where: { id },
            relations: ['user'],
        });
    }

    async findBy(
        accessProfile: AccessProfile,
        where: Partial<TicketComment>,
        options?: QueryOptions<TicketComment>,
    ): Promise<TicketComment[]> {
        const filters = {
            where: {
                ...where,
                tenantId: accessProfile.tenantId,
            } as FindOptionsWhere<TicketComment>,
            relations: options?.relations || ['user'],
            order: options?.order || ({ createdAt: 'DESC' } as FindOptionsOrder<TicketComment>),
        };

        return this.ticketCommentRepository.find(filters);
    }

    async create(accessProfile: AccessProfile, ticketCommentDto: CreateTicketCommentDto) {
        const commentUser = await this.userRepository.findOne({
            where: { id: ticketCommentDto.userId, tenantId: accessProfile.tenantId },
        });

        if (!commentUser) {
            throw new CustomNotFoundException({
                message: 'User not found',
                code: 'user-not-found',
            });
        }

        // Set the tenant ID from the user object
        const commentToSave = {
            ...ticketCommentDto,
            tenantId: accessProfile.tenantId,
        };

        const savedComment = await this.save(accessProfile, commentToSave);

        const commentWithTicket = await this.ticketCommentRepository.findOne({
            where: { id: savedComment.id, tenantId: accessProfile.tenantId },
            relations: {
                ticket: true,
            },
        });

        if (!commentWithTicket) {
            throw new CustomNotFoundException({
                message: 'Comment not found after creation',
                code: 'comment-not-found',
            });
        }

        const notifications = [];

        if (ticketCommentDto.userId !== commentWithTicket.ticket.requesterId) {
            notifications.push(
                this.notificationRepository.save({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.Comment,
                    message: '<p><span>user</span> comentou no ticket <span>resource</span>.</p>',
                    createdById: ticketCommentDto.userId,
                    targetUserId: commentWithTicket.ticket.requesterId,
                    resourceId: commentWithTicket.ticketId,
                    resourceCustomId: commentWithTicket.ticketCustomId,
                }),
            );
        }

        if (
            commentWithTicket.ticket.targetUserId &&
            ticketCommentDto.userId !== commentWithTicket.ticket.targetUserId
        ) {
            notifications.push(
                this.notificationRepository.save({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.Comment,
                    message: '<p><span>user</span> comentou no ticket <span>resource</span>.</p>',
                    createdById: ticketCommentDto.userId,
                    targetUserId: commentWithTicket.ticket.targetUserId,
                    resourceId: commentWithTicket.ticketId,
                    resourceCustomId: commentWithTicket.ticketCustomId,
                }),
            );
        }

        await Promise.all(notifications);

        //Uncomment when we are ready to use SSE
        // if (ticketCommentDto.userId !== commentWithTicket.ticket.requesterId) {
        //     this.notificationService.sendNotification(commentWithTicket.ticket.requesterId, {
        //         type: NotificationType.Comment,
        //         message: `Novo comentário de ${commentUser.firstName} ${commentUser.lastName}`,
        //         resourceId: commentWithTicket.ticketId,
        //     });
        // }

        // if (
        //     commentWithTicket.ticket.targetUserId &&
        //     ticketCommentDto.userId !== commentWithTicket.ticket.targetUserId
        // ) {
        //     this.notificationService.sendNotification(commentWithTicket.ticket.targetUserId, {
        //         type: NotificationType.Comment,
        //         message: `${commentUser.firstName} ${commentUser.lastName} comentou no ticket #${commentWithTicket.ticketId}`,
        //         resourceId: commentWithTicket.ticketId,
        //     });
        // }

        return commentWithTicket;
    }

    async update(
        accessProfile: AccessProfile,
        id: number,
        ticketCommentDto: UpdateTicketCommentDto,
    ) {
        return super.update(accessProfile, id, ticketCommentDto);
    }

    async delete(accessProfile: AccessProfile, id: number) {
        return super.delete(accessProfile, id);
    }
}
