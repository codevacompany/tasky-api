import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomBadRequestException,
    CustomForbiddenException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { QueryOptions } from '../../shared/types/http';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { RoleName } from '../role/entities/role.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
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
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>,
    ) {
        super(ticketCommentRepository);
    }

    async findAll(accessProfile: AccessProfile): Promise<TicketComment[]> {
        const options = {
            where: { tenantId: accessProfile.tenantId } as FindOptionsWhere<TicketComment>,
            relations: ['user', 'user.department'],
            order: { createdAt: 'DESC' } as FindOptionsOrder<TicketComment>,
        };
        return this.ticketCommentRepository.find(options);
    }

    async findById(accessProfile: AccessProfile, id: number): Promise<TicketComment> {
        return this.findOne(accessProfile, {
            where: { id },
            relations: ['user', 'user.department'],
        });
    }

    async findBy(
        accessProfile: AccessProfile,
        where: Partial<TicketComment>,
        options?: QueryOptions<TicketComment>,
    ): Promise<TicketComment[]> {
        const defaultRelations = ['user', 'user.department'];
        const relations = options?.relations || defaultRelations;

        // Ensure user.department is included even if custom relations are provided
        const finalRelations = Array.isArray(relations)
            ? [...new Set([...relations, ...defaultRelations])]
            : defaultRelations;

        const filters = {
            where: {
                ...where,
                tenantId: accessProfile.tenantId,
            } as FindOptionsWhere<TicketComment>,
            relations: finalRelations,
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
                user: {
                    department: true,
                },
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
                    metadata: {
                        commentText: ticketCommentDto.content,
                    },
                }),
            );
        }

        if (
            commentWithTicket.ticket.currentTargetUserId &&
            ticketCommentDto.userId !== commentWithTicket.ticket.currentTargetUserId
        ) {
            notifications.push(
                this.notificationRepository.save({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.Comment,
                    message: '<p><span>user</span> comentou no ticket <span>resource</span>.</p>',
                    createdById: ticketCommentDto.userId,
                    targetUserId: commentWithTicket.ticket.currentTargetUserId,
                    resourceId: commentWithTicket.ticketId,
                    resourceCustomId: commentWithTicket.ticketCustomId,
                    metadata: {
                        commentText: ticketCommentDto.content,
                    },
                }),
            );
        }

        // Process mentions and create notifications for mentioned users
        if (ticketCommentDto.mentions && ticketCommentDto.mentions.length > 0) {
            const mentionedUserIds = new Set(
                ticketCommentDto.mentions.map((mention) => mention.userId),
            );

            // Remove duplicates and exclude the comment author
            const uniqueMentionedUserIds = Array.from(mentionedUserIds).filter(
                (userId) => userId !== ticketCommentDto.userId,
            );

            for (const mentionedUserId of uniqueMentionedUserIds) {
                // Don't create duplicate notifications if user is already notified above
                if (
                    mentionedUserId !== commentWithTicket.ticket.requesterId &&
                    mentionedUserId !== commentWithTicket.ticket.currentTargetUserId
                ) {
                    notifications.push(
                        this.notificationRepository.save({
                            tenantId: accessProfile.tenantId,
                            type: NotificationType.Comment,
                            message:
                                '<p><span>user</span> mencionou você em um comentário no ticket <span>resource</span>.</p>',
                            createdById: ticketCommentDto.userId,
                            targetUserId: mentionedUserId,
                            resourceId: commentWithTicket.ticketId,
                            resourceCustomId: commentWithTicket.ticketCustomId,
                            metadata: {
                                commentText: ticketCommentDto.content,
                                isMention: true,
                            },
                        }),
                    );
                }
            }
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

    /**
     * Find ticket comment by UUID (public-facing identifier)
     */
    async findByUuid(accessProfile: AccessProfile, uuid: string): Promise<TicketComment> {
        const comment = await super.findByUuid(accessProfile, uuid, {
            relations: ['user', 'user.department'],
        });

        if (!comment) {
            throw new CustomNotFoundException({
                code: 'not-found',
                message: 'Ticket comment not found.',
            });
        }

        return comment;
    }

    /**
     * Update ticket comment by UUID (public-facing identifier)
     */
    async updateCommentByUuid(
        accessProfile: AccessProfile,
        uuid: string,
        dto: UpdateTicketCommentDto,
    ): Promise<TicketComment> {
        const comment = await this.findByUuidOrFail(accessProfile, uuid);

        // Security check: only the owner can update
        if (comment.userId !== accessProfile.userId) {
            throw new CustomForbiddenException({
                code: 'forbidden',
                message: 'You can only edit your own comments.',
            });
        }

        // Time limit check: 5 minutes (300,000 ms)
        const fiveMinutesInMs = 5 * 60 * 1000;
        const now = new Date();
        const commentAgeThreshold = new Date(comment.createdAt.getTime() + fiveMinutesInMs);

        if (now > commentAgeThreshold) {
            throw new CustomBadRequestException({
                code: 'time-limit-exceeded',
                message: 'O tempo para executar essa ação esgotou (limite de 5 minutos).',
            });
        }

        await super.updateByUuid(accessProfile, uuid, dto as QueryDeepPartialEntity<TicketComment>);
        return this.findByUuid(accessProfile, uuid);
    }

    /**
     * Delete ticket comment by UUID (public-facing identifier)
     */
    async deleteByUuid(accessProfile: AccessProfile, uuid: string): Promise<void> {
        const comment = await this.findByUuidOrFail(accessProfile, uuid);

        // Security check: only the owner can delete
        if (comment.userId !== accessProfile.userId) {
            throw new CustomForbiddenException({
                code: 'forbidden',
                message: 'You can only delete your own comments.',
            });
        }

        // Time limit check: 5 minutes (300,000 ms)
        const fiveMinutesInMs = 5 * 60 * 1000;
        const now = new Date();
        const commentAgeThreshold = new Date(comment.createdAt.getTime() + fiveMinutesInMs);

        if (now > commentAgeThreshold) {
            throw new CustomBadRequestException({
                code: 'time-limit-exceeded',
                message: 'O tempo para executar essa ação esgotou (limite de 5 minutos).',
            });
        }

        await super.deleteByUuid(accessProfile, uuid);
    }

    async delete(accessProfile: AccessProfile, id: number) {
        return super.delete(accessProfile, id);
    }

    /**
     * Get mentionable users for a ticket
     * Returns users from the same department as the current target user + tenant admins
     */
    async getMentionableUsers(accessProfile: AccessProfile, ticketCustomId: string) {
        const ticket = await this.ticketRepository.findOne({
            where: {
                customId: ticketCustomId,
                tenantId: accessProfile.tenantId,
            },
            relations: [
                'currentTargetUser',
                'currentTargetUser.department',
                'targetUsers',
                'targetUsers.user',
                'targetUsers.user.department',
                'reviewer',
                'reviewer.department',
                'reviewer.role',
            ],
        });

        if (!ticket) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        const mentionableUsers = [];
        const addedUserIds = new Set<number>();

        const addUser = (user: any) => {
            if (user && user.id && !addedUserIds.has(user.id)) {
                mentionableUsers.push(user);
                addedUserIds.add(user.id);
            }
        };

        // 1. Current Target User's Department (only if NOT private)
        if (!ticket.isPrivate) {
            const currentTargetUser = ticket.currentTargetUser;
            if (currentTargetUser && currentTargetUser.departmentId) {
                const departmentUsers = await this.userRepository.find({
                    where: {
                        departmentId: currentTargetUser.departmentId,
                        tenantId: accessProfile.tenantId,
                        isActive: true,
                    },
                    relations: ['department', 'role'],
                });

                for (const user of departmentUsers) {
                    addUser(user);
                }
            }
        }

        // 2. All target users from the ticket (always included)
        if (ticket.targetUsers && ticket.targetUsers.length > 0) {
            for (const targetUser of ticket.targetUsers) {
                addUser(targetUser.user);
            }
        }

        // 3. The reviewer (always included)
        if (ticket.reviewer) {
            addUser(ticket.reviewer);
        }

        // 4. Get tenant admins (always included)
        const tenantAdmins = await this.userRepository.find({
            where: {
                tenantId: accessProfile.tenantId,
                isActive: true,
                role: { name: RoleName.TenantAdmin },
            },
            relations: ['department', 'role'],
        });

        for (const admin of tenantAdmins) {
            addUser(admin);
        }

        // Sort by name
        mentionableUsers.sort((a, b) => {
            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        return mentionableUsers;
    }
}
