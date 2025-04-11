import { Injectable } from '@nestjs/common';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { UserRepository } from '../user/user.repository';
import { CreateTicketCommentDto } from './dtos/create-ticket-comment.dto';
import { UpdateTicketCommentDto } from './dtos/update-ticket-comment.dto';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketCommentRepository } from './ticket-comment.repository';

@Injectable()
export class TicketCommentService {
    constructor(
        private readonly ticketCommentRepository: TicketCommentRepository,
        private readonly userRepository: UserRepository,
        private readonly notificationService: NotificationService,
        private readonly notificationRepository: NotificationRepository,
    ) {}

    async findAll(): Promise<TicketComment[]> {
        return await this.ticketCommentRepository.find({ relations: ['user'] });
    }

    async findById(id: number): Promise<TicketComment> {
        return await this.ticketCommentRepository.findOne({
            where: { id },
            relations: ['user'],
        });
    }

    async findBy(where: Partial<TicketComment>): Promise<TicketComment[]> {
        return await this.ticketCommentRepository.find({
            where,
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    async create(ticketComment: CreateTicketCommentDto) {
        const [user, savedComment] = await Promise.all([
            this.userRepository.findOne({
                where: { id: ticketComment.userId },
            }),
            this.ticketCommentRepository.save(ticketComment),
        ]);

        const commentWithTicket = await this.ticketCommentRepository.findOne({
            where: { id: savedComment.id },
            relations: {
                ticket: true,
            },
        });

        const notifications = [];

        if (ticketComment.userId !== commentWithTicket.ticket.requesterId) {
            notifications.push(
                this.notificationRepository.save({
                    type: NotificationType.Comment,
                    message: `${user.firstName} ${user.lastName} comentou no ticket #${commentWithTicket.ticketId}`,
                    targetUserId: commentWithTicket.ticket.requesterId,
                    resourceId: commentWithTicket.ticketId,
                }),
            );
        }

        if (
            commentWithTicket.ticket.targetUserId &&
            ticketComment.userId !== commentWithTicket.ticket.targetUserId
        ) {
            notifications.push(
                this.notificationRepository.save({
                    type: NotificationType.Comment,
                    message: `${user.firstName} ${user.lastName} comentou no ticket #${commentWithTicket.ticketId}`,
                    targetUserId: commentWithTicket.ticket.targetUserId,
                    resourceId: commentWithTicket.ticketId,
                }),
            );
        }

        await Promise.all(notifications);

        if (ticketComment.userId !== commentWithTicket.ticket.requesterId) {
            this.notificationService.sendNotification(commentWithTicket.ticket.requesterId, {
                type: NotificationType.Comment,
                message: `Novo comentário de ${user.firstName} ${user.lastName}`,
                resourceId: commentWithTicket.ticketId,
            });
        }

        if (
            commentWithTicket.ticket.targetUserId &&
            ticketComment.userId !== commentWithTicket.ticket.targetUserId
        ) {
            this.notificationService.sendNotification(commentWithTicket.ticket.targetUserId, {
                type: NotificationType.Comment,
                message: `${user.firstName} ${user.lastName} comentou no ticket #${commentWithTicket.ticketId}`,
                resourceId: commentWithTicket.ticketId,
            });
        }

        return commentWithTicket;
    }

    async update(id: number, ticketComment: UpdateTicketCommentDto) {
        await this.ticketCommentRepository.update(id, ticketComment);

        return {
            message: 'Successfully updated!',
            ticketUpdateId: id,
        };
    }
}
