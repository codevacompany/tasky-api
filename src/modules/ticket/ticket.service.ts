import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindOptionsOrder, FindOptionsWhere, In } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomForbiddenException,
    CustomNotFoundException,
    CustomBadRequestException,
} from '../../shared/exceptions/http-exception';
import { EmailService } from '../../shared/services/email/email.service';
import { EncryptionService } from '../../shared/services/encryption/encryption.service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import {
    extractFileName,
    extractMimeTypeFromUrl,
    formatSnakeToNaturalCase,
} from '../../shared/utils/file-helper';
import { CorrectionRequestService } from '../correction-request-reason/correction-request-reason.service';
import { CorrectionReason } from '../correction-request-reason/entities/correction-request-reason.entity';
import { CreateCorrectionRequestDto } from '../correction-request-reason/dtos/create-correction-request-reason.dto';
import { NotificationType } from '../notification/entities/notification.entity';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { TenantRepository } from '../tenant/tenant.repository';
import { TenantSubscriptionService } from '../tenant-subscription/tenant-subscription.service';
import { CreateTicketCancellationReasonDto } from '../ticket-cancellation-reason/dtos/create-ticket-cancellation-reason.dto';
import { CancellationReason } from '../ticket-cancellation-reason/entities/ticket-cancellation-reason.entity';
import { TicketCancellationReasonService } from '../ticket-cancellation-reason/ticket-cancellation-reason.service';
import { CreateTicketDisapprovalReasonDto } from '../ticket-disapproval-reason/dtos/create-ticket-rejection-reason.dto';
import { DisapprovalReason } from '../ticket-disapproval-reason/entities/ticket-disapproval-reason.entity';
import { TicketDisapprovalReasonService } from '../ticket-disapproval-reason/ticket-disapproval-reason.service';
import { TicketFileRepository } from '../ticket-file/ticket-file.repository';
import { TicketActionType } from '../ticket-updates/entities/ticket-update.entity';
import { TicketUpdateRepository } from '../ticket-updates/ticket-update.repository';
import { TicketTargetUserRepository } from '../ticket-target-user/ticket-target-user.repository';
import { UserRepository } from '../user/user.repository';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { UpdateTicketDto } from './dtos/update-ticket.dto';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketRepository } from './ticket.repository';
import { RoleName } from '../role/entities/role.entity';
import { RoleService } from '../role/role.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusAction } from '../status-action/entities/status-action.entity';
import { TicketStatus as TicketStatusEntity } from '../ticket-status/entities/ticket-status.entity';
import { DepartmentService } from '../department/department.service';
import { TicketChecklistItem } from '../ticket-checklist/entities/ticket-checklist-item.entity';

@Injectable()
export class TicketService extends TenantBoundBaseService<Ticket> {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly ticketRepository: TicketRepository,
        private readonly notificationService: NotificationService,
        private readonly notificationRepository: NotificationRepository,
        private readonly userRepository: UserRepository,
        private readonly ticketUpdateRepository: TicketUpdateRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly ticketFileRepository: TicketFileRepository,
        private readonly ticketCancellationReasonService: TicketCancellationReasonService,
        private readonly ticketDisapprovalReasonService: TicketDisapprovalReasonService,
        private readonly correctionRequestService: CorrectionRequestService,
        private readonly emailService: EmailService,
        private readonly encryptionService: EncryptionService,
        private readonly tenantSubscriptionService: TenantSubscriptionService,
        private readonly ticketTargetUserRepository: TicketTargetUserRepository,
        private readonly roleService: RoleService,
        private readonly departmentService: DepartmentService,
        @InjectRepository(StatusAction)
        private readonly statusActionRepository: Repository<StatusAction>,
        @InjectRepository(TicketStatusEntity)
        private readonly ticketStatusRepository: Repository<TicketStatusEntity>,
        @InjectRepository(TicketChecklistItem)
        private readonly ticketChecklistItemRepository: Repository<TicketChecklistItem>,
    ) {
        super(ticketRepository);
    }

    /**
     * Helper method to get departmentId from a userId
     * Used to store the department at the time of ticket update creation
     */
    private async getDepartmentIdFromUserId(
        userId: number | null | undefined,
        tenantId: number,
    ): Promise<number | null> {
        if (!userId) return null;

        const user = await this.userRepository.findOne({
            where: { id: userId, tenantId },
            select: ['departmentId'],
        });

        return user?.departmentId || null;
    }

    async findAll(accessProfile: AccessProfile, options?: QueryOptions<Ticket>) {
        const qb = this.buildLightweightQueryBuilder(accessProfile.tenantId);

        // Apply where filters
        if (options?.where) {
            await this.applyWhereFilters(qb, accessProfile, options.where);
        }

        // Apply status filter
        const whereWithStatus = options?.where as any;
        if (whereWithStatus?.status !== undefined) {
            this.applyStatusFilter(qb, whereWithStatus.status);
        } else {
            this.applyDefaultStatusFilter(qb);
        }

        this.applySorting(qb, options?.order);

        // Apply pagination
        const page = options?.page || 1;
        const limit = options?.limit || 10;

        if (options?.paginated !== false) {
            qb.skip((page - 1) * limit).take(limit);
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: options?.paginated === false ? 1 : Math.ceil(total / limit),
        };
    }

    async findByDepartment(
        accessProfile: AccessProfile,
        departmentId: number,
        options?: QueryOptions<Ticket>,
    ) {
        const requesterRole = await this.roleService.findById(accessProfile.roleId);

        const isSupervisor = requesterRole?.name === RoleName.Supervisor;

        const qb = this.buildLightweightQueryBuilder(accessProfile.tenantId);

        // Filter by department via targetUsers using EXISTS to avoid duplicates
        qb.andWhere(
            `EXISTS (
                SELECT 1
                FROM ticket_target_user ttu
                INNER JOIN "user" u ON u.id = ttu."userId"
                WHERE ttu."ticketId" = ticket.id
                AND u."departmentId" = :departmentId
            )`,
            { departmentId },
        );

        if (!isSupervisor) {
            qb.andWhere('ticket.isPrivate = :isPrivate', { isPrivate: false });
        }

        if (options?.where) {
            await this.applyWhereFilters(qb, accessProfile, options.where);
        }

        const whereWithStatus = options?.where as FindOptionsWhere<Ticket> & { status?: any };
        if (whereWithStatus?.status !== undefined) {
            this.applyStatusFilter(qb, whereWithStatus.status);
        } else {
            this.applyDefaultStatusFilter(qb);
        }
        this.applySorting(qb, options?.order);

        const page = options?.page || 1;
        const limit = options?.limit || 10;

        // Only apply pagination if paginated is not explicitly set to false
        if (options?.paginated !== false) {
            qb.skip((page - 1) * limit).take(limit);
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: options?.paginated === false ? 1 : Math.ceil(total / limit),
        };
    }

    async findMany(accessProfile: AccessProfile, options?: QueryOptions<Ticket>) {
        const qb = this.buildLightweightQueryBuilder(accessProfile.tenantId);

        // Check if user is Supervisor and filter by their department
        const user = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (user) {
            const role = await this.roleService.findById(user.roleId);
            if (role && role.name === 'Supervisor') {
                qb.andWhere(
                    `(
                        ticket.requesterId = :supervisorId
                        OR EXISTS (
                            SELECT 1
                            FROM ticket_target_user ttu
                            WHERE ttu."ticketId" = ticket.id
                            AND ttu."userId" = :supervisorId
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM ticket_target_user ttu
                            INNER JOIN "user" u ON u.id = ttu."userId"
                            WHERE ttu."ticketId" = ticket.id
                            AND u."departmentId" = :departmentId
                        )
                    )`,
                    { supervisorId: user.id, departmentId: user.departmentId },
                );
            }
        }

        // Apply where filters
        if (options?.where) {
            await this.applyWhereFilters(qb, accessProfile, options.where);
        }

        // Apply status filter
        const whereWithStatus = options?.where as FindOptionsWhere<Ticket> & { status?: any };
        if (whereWithStatus?.status !== undefined) {
            this.applyStatusFilter(qb, whereWithStatus.status);
        } else {
            this.applyDefaultStatusFilter(qb);
        }
        this.applySorting(qb, options?.order);

        // Apply pagination
        const page = options?.page || 1;
        const limit = options?.limit || 10;

        // Only apply pagination if paginated is not explicitly set to false
        if (options?.paginated !== false) {
            qb.skip((page - 1) * limit).take(limit);
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: options?.paginated === false ? 1 : Math.ceil(total / limit),
        };
    }

    async findById(accessProfile: AccessProfile, customId: string): Promise<Ticket> {
        const ticket = await this.findOne(accessProfile, {
            where: { customId },
            relations: [
                'requester',
                'requester.department',
                'currentTargetUser',
                'currentTargetUser.department',
                'targetUsers',
                'targetUsers.user',
                'targetUsers.user.department',
                'reviewer',
                'reviewer.department',
                'category',
                'files',
                'comments',
                'comments.user',
                'comments.user.department',
                'cancellationReason',
                'disapprovalReason',
                'correctionRequests',
                'ticketStatus',
                'checklistItems',
                'checklistItems.assignedTo',
                'checklistItems.assignedTo.department',
            ],
        });

        if (!ticket) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        // Get current user
        const currentUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (!currentUser) {
            throw new CustomNotFoundException({
                code: 'user-not-found',
                message: 'User not found.',
            });
        }

        // Check if user has access to this ticket
        const hasAccess = await this.checkTicketAccess(ticket, currentUser);

        if (!hasAccess) {
            throw new CustomForbiddenException({
                code: 'ticket-access-denied',
                message: 'You do not have permission to access this ticket.',
            });
        }

        return ticket;
    }

    /**
     * Check if a user has access to a ticket
     * Rules:
     * 1. User is a tenant admin (can access all tickets, including private ones)
     * 2. User is the requester
     * 3. User is the current target user
     * 4. User is one of the target users
     * 5. User is the reviewer
     * 6. If ticket is not private, user's department matches any target user's department
     */
    private async checkTicketAccess(ticket: Ticket, user: any): Promise<boolean> {
        const userId = user.id;
        const userDepartmentId = user.departmentId;

        if (user.roleId) {
            const role = await this.roleService.findById(user.roleId);
            if (role && role.name === RoleName.TenantAdmin) {
                return true;
            }
        }

        if (ticket.requesterId === userId) {
            return true;
        }

        if (ticket.currentTargetUserId === userId) {
            return true;
        }

        if (ticket.targetUsers && ticket.targetUsers.some((tu) => tu.userId === userId)) {
            return true;
        }

        if (ticket.reviewerId === userId) {
            return true;
        }

        if (!ticket.isPrivate && userDepartmentId) {
            if (ticket.targetUsers && ticket.targetUsers.length > 0) {
                const targetUserDepartments = ticket.targetUsers
                    .map((tu) => tu.user?.departmentId)
                    .filter((deptId) => deptId !== null && deptId !== undefined);

                if (targetUserDepartments.includes(userDepartmentId)) {
                    return true;
                }
            }
        }

        return false;
    }

    async findBy(
        accessProfile: AccessProfile,
        options?: QueryOptions<Ticket>,
    ): Promise<PaginatedResponse<Ticket>> {
        const qb = this.buildLightweightQueryBuilder(accessProfile.tenantId);

        // Check if user is Supervisor and filter by their department
        const user = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (user) {
            const role = await this.roleService.findById(user.roleId);
            if (role && role.name === 'Supervisor') {
                // Filter by department if Supervisor:
                // - Show tickets created by the Supervisor
                // - Show tickets where Supervisor is assigned as target user
                // - Show tickets where at least one target user is from Supervisor's department
                qb.andWhere(
                    `(
                        ticket.requesterId = :supervisorId
                        OR EXISTS (
                            SELECT 1
                            FROM ticket_target_user ttu
                            WHERE ttu."ticketId" = ticket.id
                            AND ttu."userId" = :supervisorId
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM ticket_target_user ttu
                            INNER JOIN "user" u ON u.id = ttu."userId"
                            WHERE ttu."ticketId" = ticket.id
                            AND u."departmentId" = :departmentId
                        )
                    )`,
                    { supervisorId: user.id, departmentId: user.departmentId },
                );
            }
        }

        const whereWithStatus = options?.where as FindOptionsWhere<Ticket> & { status?: any };
        await this.applyWhereFilters(qb, accessProfile, whereWithStatus);
        this.applyDefaultStatusFilter(qb, whereWithStatus?.status);
        this.applySorting(qb, options?.order);

        const page = options?.page || 1;
        const limit = options?.limit || 10;

        // Only apply pagination if paginated is not explicitly set to false
        if (options?.paginated !== false) {
            qb.skip((page - 1) * limit).take(limit);
        }

        const [items, total] = await qb.getManyAndCount();

        // Filter old tickets (without tokens) in memory if name search was performed
        let filteredItems = items;
        let filteredTotal = total;

        if (whereWithStatus?.name && typeof whereWithStatus.name === 'string') {
            const nameValue = whereWithStatus.name.toLowerCase();
            const normalizedSearch = nameValue
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove accents
                .trim();

            filteredItems = items.filter((ticket) => {
                // If ticket has tokens, it was already matched by the query
                if (ticket.nameSearchTokens && ticket.nameSearchTokens.length > 0) {
                    return true;
                }

                // For old tickets without tokens, filter by decrypted name
                if (ticket.name) {
                    const normalizedName = ticket.name
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '') // Remove accents
                        .trim();

                    return normalizedName.includes(normalizedSearch);
                }

                return false;
            });

            // Recalculate total if we filtered items
            if (filteredItems.length !== items.length) {
                // Need to recalculate total count including old tickets
                const countQb = this.buildBaseQueryBuilder(accessProfile.tenantId);
                await this.applyWhereFilters(countQb, accessProfile, whereWithStatus);
                this.applyDefaultStatusFilter(countQb, whereWithStatus?.status);

                // Remove pagination for count
                const allItems = await countQb.getMany();
                filteredTotal = allItems.filter((ticket) => {
                    if (ticket.nameSearchTokens && ticket.nameSearchTokens.length > 0) {
                        return true;
                    }
                    if (ticket.name) {
                        const normalizedName = ticket.name
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .trim();
                        return normalizedName.includes(normalizedSearch);
                    }
                    return false;
                }).length;
            }
        }

        return {
            items: filteredItems,
            total: filteredTotal,
            page,
            limit,
            totalPages: options?.paginated === false ? 1 : Math.ceil(filteredTotal / limit),
        };
    }

    /**
     * Lightweight query builder for list views (Kanban, Table)
     * Only includes essential relations needed for displaying ticket cards/rows.
     * This significantly reduces database transfer by excluding:
     * - Full files data (only id needed for count)
     * - Full comments data (only id needed for count)
     * - cancellationReason, disapprovalReason, correctionRequests (only needed in detail view)
     * - Deep nested relations like comment user departments
     * - checklistItems.assignedTo relations (only isCompleted needed for progress)
     */
    private buildLightweightQueryBuilder(tenantId: number) {
        return (
            this.repository
                .createQueryBuilder('ticket')
                // Requester - only basic info needed
                .leftJoin('ticket.requester', 'requester')
                .addSelect([
                    'requester.id',
                    'requester.firstName',
                    'requester.lastName',
                    'requester.isActive',
                ])
                .leftJoin('requester.department', 'requesterDepartment')
                .addSelect(['requesterDepartment.id', 'requesterDepartment.name'])
                // Target users - needed for displaying assignees
                .leftJoinAndSelect('ticket.targetUsers', 'targetUsers')
                .leftJoin('targetUsers.user', 'targetUser')
                .addSelect([
                    'targetUser.id',
                    'targetUser.firstName',
                    'targetUser.lastName',
                    'targetUser.isActive',
                    'targetUser.departmentId',
                ])
                .leftJoin('targetUser.department', 'targetUserDepartment')
                .addSelect(['targetUserDepartment.id', 'targetUserDepartment.name'])
                // Reviewer - only id needed for verification flow checks
                .leftJoin('ticket.reviewer', 'reviewer')
                .addSelect(['reviewer.id'])
                // Status - essential for status display
                .leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus')
                // Category - for category display
                .leftJoin('ticket.category', 'category')
                .addSelect(['category.id', 'category.name'])
                // Checklist items - only basic fields for progress calculation
                .leftJoin('ticket.checklistItems', 'checklistItems')
                .addSelect(['checklistItems.id', 'checklistItems.isCompleted'])
                // Files - only id for count (frontend uses .length)
                .leftJoin('ticket.files', 'files')
                .addSelect(['files.id'])
                // Comments - only id for count (frontend uses .length)
                .leftJoin('ticket.comments', 'comments')
                .addSelect(['comments.id'])
                .where('ticket.tenantId = :tenantId', { tenantId })
        );
    }

    /**
     * Full query builder for detail views
     * Includes all relations needed for the ticket detail modal
     */
    private buildBaseQueryBuilder(tenantId: number) {
        return this.repository
            .createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.requester', 'requester')
            .leftJoinAndSelect('requester.department', 'requesterDepartment')
            .leftJoinAndSelect('ticket.currentTargetUser', 'currentTargetUser')
            .leftJoinAndSelect('currentTargetUser.department', 'currentTargetUserDepartment')
            .leftJoinAndSelect('ticket.targetUsers', 'targetUsers')
            .leftJoinAndSelect('targetUsers.user', 'targetUser')
            .leftJoinAndSelect('targetUser.department', 'targetUserDepartment')
            .leftJoinAndSelect('ticket.reviewer', 'reviewer')
            .leftJoinAndSelect('reviewer.department', 'reviewerDepartment')
            .leftJoinAndSelect('ticket.category', 'category')
            .leftJoinAndSelect('ticket.files', 'files')
            .leftJoinAndSelect('ticket.comments', 'comments')
            .leftJoinAndSelect('comments.user', 'commentUser')
            .leftJoinAndSelect('commentUser.department', 'commentUserDepartment')
            .leftJoinAndSelect('ticket.cancellationReason', 'cancellationReason')
            .leftJoinAndSelect('ticket.disapprovalReason', 'disapprovalReason')
            .leftJoinAndSelect('ticket.correctionRequests', 'correctionRequests')
            .leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus')
            .leftJoinAndSelect('ticket.checklistItems', 'checklistItems')
            .leftJoinAndSelect('checklistItems.assignedTo', 'checklistItemAssignedTo')
            .leftJoinAndSelect(
                'checklistItemAssignedTo.department',
                'checklistItemAssignedToDepartment',
            )
            .where('ticket.tenantId = :tenantId', { tenantId });
    }

    private applySorting(
        qb: ReturnType<typeof this.repository.createQueryBuilder>,
        order?: FindOptionsOrder<Ticket>,
    ) {
        const existingOrderBys = qb.expressionMap.orderBys;
        if (existingOrderBys && Object.keys(existingOrderBys).length > 0) {
            qb.expressionMap.orderBys = {};
        }

        if (order && Object.keys(order).length > 0) {
            Object.entries(order).forEach(([field, direction]) => {
                let dir: 'ASC' | 'DESC';
                if (typeof direction === 'string') {
                    dir = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
                } else if (direction === 1) {
                    dir = 'ASC';
                } else {
                    dir = 'DESC';
                }
                qb.addOrderBy(`ticket.${field}`, dir);
            });
        } else {
            qb.addOrderBy('ticket.createdAt', 'DESC');
        }
    }

    private async applyWhereFilters(
        qb: ReturnType<typeof this.repository.createQueryBuilder>,
        accessProfile: AccessProfile,
        where?: FindOptionsWhere<Ticket> & {
            status?: any;
            departmentId?: number;
            departmentUuid?: string;
            targetUserId?: number;
            targetUserUuid?: string;
        },
    ) {
        if (!where) return;

        const simpleEqualityFields: (keyof Ticket)[] = [
            'isPrivate',
            'requesterId',
            'priority',
        ] as const;

        for (const field of simpleEqualityFields) {
            if (where[field] !== undefined && where[field] !== null) {
                qb.andWhere(`ticket.${field} = :${field}`, { [field]: where[field] });
            }
        }

        if (where.name) {
            // Handle both string and FindOperator types
            const nameValue = typeof where.name === 'string' ? where.name : null;

            if (nameValue) {
                // Search using tokens for encrypted name field
                const searchTokens = this.encryptionService.createSearchTokens(nameValue);

                if (searchTokens.length > 0) {
                    // Use PostgreSQL array overlap operator (&&) to check if any token matches
                    // This allows partial search: if user searches "bug crítico", it will find tickets
                    // that contain either "bug" OR "crítico" (or both)
                    // Also include tickets without tokens (old tickets) - they will be filtered in memory
                    qb.andWhere(
                        `(
                            ticket."nameSearchTokens" && :searchTokens::text[]
                            OR ticket."nameSearchTokens" IS NULL
                            OR array_length(ticket."nameSearchTokens", 1) IS NULL
                            OR ticket.customId ILIKE :name
                        )`,
                    );
                    qb.setParameter('searchTokens', searchTokens);
                    qb.setParameter('name', `%${nameValue}%`);
                } else {
                    // Fallback to customId search if no valid tokens
                    qb.andWhere('ticket.customId ILIKE :name', {
                        name: `%${nameValue}%`,
                    });
                }
            }
        }

        let targetUserId = where.targetUserId;
        if (where.targetUserUuid && !targetUserId) {
            try {
                const user = await this.userRepository.findOne({
                    where: { uuid: where.targetUserUuid, tenantId: accessProfile.tenantId },
                });
                if (user) {
                    targetUserId = user.id;
                } else {
                    return;
                }
            } catch {
                return;
            }
        }

        if (targetUserId !== undefined && targetUserId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    WHERE ttu."ticketId" = ticket.id
                    AND ttu."userId" = :targetUserId
                )`,
                { targetUserId },
            );
        }

        let departmentId = where.departmentId;
        if (where.departmentUuid && !departmentId) {
            try {
                const department = await this.departmentService.findByUuid(
                    accessProfile,
                    where.departmentUuid,
                );
                departmentId = department.id;
            } catch {
                // Department not found, skip filter
                return;
            }
        }

        if (departmentId !== undefined && departmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId },
            );
        }
    }

    private applyDefaultStatusFilter(
        qb: ReturnType<typeof this.repository.createQueryBuilder>,
        statusFilter?: any,
    ) {
        if (statusFilter !== undefined) {
            this.applyStatusFilter(qb, statusFilter);
            return;
        }

        // Ensure ticketStatus join exists
        if (!qb.expressionMap.joinAttributes.find((j) => j.alias.name === 'ticketStatus')) {
            qb.leftJoin('ticket.ticketStatus', 'ticketStatus');
        }

        // Default: exclude terminal statuses OR include recent completed tickets (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        qb.andWhere(
            '(ticketStatus.key NOT IN (:...terminalStatuses) OR (ticketStatus.key = :completedStatus AND ticket.completedAt >= :sevenDaysAgo))',
            {
                terminalStatuses: [TicketStatus.Rejected, TicketStatus.Canceled],
                completedStatus: TicketStatus.Completed,
                sevenDaysAgo,
            },
        );
    }

    private applyStatusFilter(
        qb: ReturnType<typeof this.repository.createQueryBuilder>,
        statusValue: any,
    ) {
        // Ensure ticketStatus join exists
        if (!qb.expressionMap.joinAttributes.find((j) => j.alias.name === 'ticketStatus')) {
            qb.leftJoin('ticket.ticketStatus', 'ticketStatus');
        }

        // Handle TypeORM operators (e.g., Not(In([...])))
        if (statusValue && typeof statusValue === 'object' && '_type' in statusValue) {
            if (statusValue._type === 'not' && statusValue._value?._type === 'in') {
                const excludedStatuses = statusValue._value._value;
                // Filter out Completed from exclusion to allow recent completed tickets
                qb.andWhere('ticketStatus.key NOT IN (:...excludedStatuses)', {
                    excludedStatuses: excludedStatuses.filter(
                        (s: string) => s !== TicketStatus.Completed,
                    ),
                });
            } else {
                // Log unhandled TypeORM operator for debugging
                console.warn('Unhandled TypeORM status operator:', statusValue);
            }
        } else {
            qb.andWhere('ticketStatus.key = :status', { status: statusValue });
        }
    }

    async findByReceived(
        accessProfile: AccessProfile,
        userId: number,
        options?: QueryOptions<Ticket>,
    ): Promise<PaginatedResponse<Ticket>> {
        const qb = this.buildLightweightQueryBuilder(accessProfile.tenantId).andWhere(
            '(ticket.currentTargetUserId = :userId OR EXISTS (SELECT 1 FROM "ticket_target_user" ttu WHERE ttu."ticketId" = ticket.id AND ttu."userId" = :userId) OR (ticket.reviewerId = :userId AND ticket.requesterId != :userId))',
            {
                userId,
            },
        );

        const whereWithStatus = options?.where as FindOptionsWhere<Ticket> & { status?: any };
        if (whereWithStatus?.status) {
            qb.andWhere('ticketStatus.key = :status', { status: whereWithStatus.status });
        } else {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            qb.andWhere(
                '(ticketStatus.key NOT IN (:...statuses) OR (ticketStatus.key = :completedStatus AND ticket.completedAt >= :sevenDaysAgo))',
                {
                    statuses: [TicketStatus.Rejected, TicketStatus.Canceled],
                    completedStatus: TicketStatus.Completed,
                    sevenDaysAgo: sevenDaysAgo,
                },
            );
        }

        if (options?.where) {
            if (options.where.name) {
                qb.andWhere('(ticket.name ILIKE :name OR ticket.customId ILIKE :name)', {
                    name: `%${options.where.name}%`,
                });
            }
            if (options.where.priority) {
                qb.andWhere('ticket.priority = :priority', { priority: options.where.priority });
            }
        }
        this.applySorting(qb, options?.order);

        const page = options?.page || 1;
        const limit = options?.limit || 10;

        // Only apply pagination if paginated is not explicitly set to false
        if (options?.paginated !== false) {
            qb.skip((page - 1) * limit).take(limit);
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: options?.paginated === false ? 1 : Math.ceil(total / limit),
        };
    }

    async findByTargetUser(
        accessProfile: AccessProfile,
        userId: number,
        options?: QueryOptions<Ticket>,
    ): Promise<PaginatedResponse<Ticket>> {
        const qb = this.buildLightweightQueryBuilder(accessProfile.tenantId).andWhere(
            '(ticket.currentTargetUserId = :userId OR EXISTS (SELECT 1 FROM "ticket_target_user" ttu WHERE ttu."ticketId" = ticket.id AND ttu."userId" = :userId))',
            {
                userId,
            },
        );

        const whereWithStatus = options?.where as FindOptionsWhere<Ticket> & { status?: any };
        if (whereWithStatus?.status) {
            qb.andWhere('ticketStatus.key = :status', { status: whereWithStatus.status });
        } else {
            // Include completed tickets from the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            qb.andWhere(
                '(ticketStatus.key NOT IN (:...statuses) OR (ticketStatus.key = :completedStatus AND ticket.completedAt >= :sevenDaysAgo))',
                {
                    statuses: [TicketStatus.Rejected, TicketStatus.Canceled],
                    completedStatus: TicketStatus.Completed,
                    sevenDaysAgo: sevenDaysAgo,
                },
            );
        }

        if (options?.where) {
            if (options.where.name) {
                qb.andWhere('(ticket.name ILIKE :name OR ticket.customId ILIKE :name)', {
                    name: `%${options.where.name}%`,
                });
            }
            if (options.where.priority) {
                qb.andWhere('ticket.priority = :priority', { priority: options.where.priority });
            }
        }
        this.applySorting(qb, options?.order);

        const page = options?.page || 1;
        const limit = options?.limit || 10;

        // Only apply pagination if paginated is not explicitly set to false
        if (options?.paginated !== false) {
            qb.skip((page - 1) * limit).take(limit);
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: options?.paginated === false ? 1 : Math.ceil(total / limit),
        };
    }

    async create(accessProfile: AccessProfile, ticketDto: CreateTicketDto) {
        const {
            files,
            targetUserIds,
            checklistItems: checklistItemsDto,
            ...ticketData
        } = ticketDto;

        const requester = await this.userRepository.findOne({
            where: { id: ticketDto.requesterId, tenantId: accessProfile.tenantId },
        });

        if (!requester) {
            throw new CustomNotFoundException({
                message: 'Requester not found',
                code: 'requester-not-found',
            });
        }

        const targetUsers = await this.userRepository.find({
            where: { id: In(targetUserIds), tenantId: accessProfile.tenantId },
        });

        if (targetUsers.length !== targetUserIds.length) {
            throw new CustomNotFoundException({
                message: 'One or more target users not found',
                code: 'target-users-not-found',
            });
        }

        if (ticketDto.isPrivate && targetUserIds.includes(ticketDto.requesterId)) {
            throw new CustomBadRequestException({
                message: 'Cannot create a private ticket with yourself as a target user',
                code: 'private-ticket-to-self',
            });
        }

        const firstTargetUser = targetUsers.find((user) => user.id === targetUserIds[0]);

        const isRequesterInTargetUsers = targetUserIds.includes(ticketDto.requesterId);

        let reviewerId: number | null = null;

        if (isRequesterInTargetUsers) {
            const supervisorRole = await this.roleService.findByName(RoleName.Supervisor);

            if (supervisorRole && requester.roleId !== supervisorRole.id) {
                const departmentSupervisor = await this.userRepository.findOne({
                    where: {
                        tenantId: accessProfile.tenantId,
                        departmentId: requester.departmentId,
                        roleId: supervisorRole.id,
                        isActive: true,
                    } as any,
                });
                reviewerId = departmentSupervisor ? departmentSupervisor.id : null;
            } else {
                reviewerId = null;
            }
        } else {
            reviewerId = ticketDto.requesterId;
        }

        let createdTicket: Ticket;

        await this.dataSource.transaction(async (manager) => {
            const lastTicket = await manager
                .createQueryBuilder(Ticket, 'ticket')
                .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                .orderBy('ticket.id', 'DESC')
                .setLock('pessimistic_write')
                .getOne();

            const tenant = await this.tenantRepository.findOne({
                where: { id: accessProfile.tenantId },
            });

            if (!tenant) {
                throw new CustomNotFoundException({
                    message: 'Tenant not found',
                    code: 'tenant-not-found',
                });
            }

            const nextNumber = lastTicket ? parseInt(lastTicket.customId.split('-')[1]) + 1 : 1;
            const customId = `${tenant.customKey}-${nextNumber}`;

            // Find the "Pendente" status for this tenant
            const pendingStatus = await manager.findOne(TicketStatusEntity, {
                where: { key: TicketStatus.Pending, tenantId: accessProfile.tenantId },
            });

            if (!pendingStatus) {
                throw new CustomNotFoundException({
                    message:
                        'Pending status not found for tenant. Please run the status column seeder.',
                    code: 'pending-status-not-found',
                });
            }

            // Generate search tokens for encrypted name field
            const nameSearchTokens = ticketDto.name
                ? this.encryptionService.createSearchTokens(ticketDto.name)
                : [];

            const ticket = manager.create(Ticket, {
                ...ticketData,
                customId,
                nameSearchTokens,
                tenantId: accessProfile.tenantId,
                createdById: requester.id,
                updatedById: requester.id,
                currentTargetUserId: firstTargetUser.id,
                reviewerId,
                statusId: pendingStatus.id,
            });

            createdTicket = await manager.save(ticket);

            const ticketTargetUsers = targetUserIds.map((userId, index) => ({
                ticketId: createdTicket.id,
                userId,
                order: index + 1,
                tenantId: accessProfile.tenantId,
                createdById: requester.id,
                updatedById: requester.id,
            }));

            await manager.save(this.ticketTargetUserRepository.create(ticketTargetUsers));

            if (files?.length) {
                const ticketFiles = files.map((url: string) => ({
                    tenantId: accessProfile.tenantId,
                    url,
                    name: extractFileName(url),
                    mimeType: extractMimeTypeFromUrl(url),
                    ticketId: createdTicket.id,
                    createdById: requester.id,
                    updatedById: requester.id,
                }));

                await manager.save(this.ticketFileRepository.create(ticketFiles));
            }

            if (checklistItemsDto?.length) {
                const checklistItems = checklistItemsDto.map((item, index) => ({
                    ...item,
                    ticketId: createdTicket.id,
                    tenantId: accessProfile.tenantId,
                    createdById: requester.id,
                    updatedById: requester.id,
                    order: item.order !== undefined ? item.order : index,
                }));

                await manager.save(this.ticketChecklistItemRepository.create(checklistItems));
            }

            await manager.save(
                this.ticketUpdateRepository.create({
                    tenantId: accessProfile.tenantId,
                    ticketId: createdTicket.id,
                    ticketCustomId: createdTicket.customId,
                    performedById: requester.id,
                    createdById: requester.id,
                    updatedById: requester.id,
                    action: TicketActionType.Creation,
                    fromStatus: null,
                    toStatus: TicketStatus.Pending,
                    fromUserId: null,
                    toUserId: firstTargetUser.id,
                    fromDepartmentId: null,
                    toDepartmentId: firstTargetUser.departmentId,
                    description: '<p><span>user</span> criou esta tarefa.</p>',
                }),
            );

            const isGroupTicket = targetUserIds.length > 1;
            const messagePrefix = isGroupTicket
                ? 'criou uma tarefa em grupo para você'
                : 'criou uma nova tarefa para você';

            for (const targetUser of targetUsers) {
                if (ticketDto.requesterId !== targetUser.id) {
                    await manager.save(
                        this.notificationRepository.create({
                            tenantId: accessProfile.tenantId,
                            type: NotificationType.Open,
                            message: `<p><span>user</span> ${messagePrefix}.</p>`,
                            createdById: requester.id,
                            updatedById: requester.id,
                            targetUserId: targetUser.id,
                            resourceId: createdTicket.id,
                            resourceCustomId: createdTicket.customId,
                        }),
                    );

                    const message = `Nova tarefa criada por <span style="font-weight: 600;">${requester.firstName} ${requester.lastName}</span>.`;

                    const emailNotificationsEnabled = await this.isEmailNotificationsEnabled(
                        accessProfile.tenantId,
                    );
                    if (emailNotificationsEnabled) {
                        const ticketLink = `${process.env.FRONTEND_URL}/minhas-tarefas?ticket=${createdTicket.customId}`;
                        this.emailService.sendMail({
                            subject: `Uma nova tarefa foi criada para você.`,
                            html: this.emailService.compileTemplate('ticket-update', {
                                message,
                                ticketLink,
                            }),
                            to: targetUser.email,
                        });
                    }
                }
            }
        });

        //Uncomment when ready to use SSE
        // this.notificationService.sendNotification(ticket.targetUserId, {
        //     type: NotificationType.StatusUpdated,
        //     message: `Novo ticket criado por ${requester.firstName} ${requester.lastName}.`,
        //     resourceId: ticketResponse.id,
        // });

        return createdTicket;
    }

    async updateTicket(accessProfile: AccessProfile, customId: string, ticketDto: UpdateTicketDto) {
        const ticketResponse = await this.findById(accessProfile, customId);

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        if (
            accessProfile.userId !== ticketResponse.requester.id &&
            accessProfile.userId !== ticketResponse.currentTargetUser?.id
        ) {
            throw new CustomForbiddenException({
                message: 'User not allowed to update this ticket.',
                code: 'user-not-allowed-to-update-ticket',
            });
        }

        // Generate search tokens if name is being updated
        const updateData: any = { ...ticketDto };
        if (ticketDto.name !== undefined) {
            updateData.nameSearchTokens = this.encryptionService.createSearchTokens(ticketDto.name);
        }

        await this.repository.update(ticketResponse.id, updateData);

        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            accessProfile.userId,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.Update,
            fromStatus: ticketResponse.ticketStatus?.key || null,
            toStatus: ticketResponse.ticketStatus?.key || null,
            fromUserId: accessProfile.userId || null,
            toUserId: accessProfile.userId || null,
            fromDepartmentId,
            toDepartmentId: fromDepartmentId,
            description: '<p><span>user</span> atualizou esta tarefa.</p>',
        });

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticketResponse.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        for (const ticketTargetUser of targetUsers) {
            if (accessProfile.userId !== ticketTargetUser.userId) {
                await this.notificationRepository.save({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.TicketUpdate,
                    message: '<p><span>user</span> atualizou a tarefa <span>resource</span>.</p>',
                    createdById: accessProfile.userId,
                    updatedById: accessProfile.userId,
                    targetUserId: ticketTargetUser.userId,
                    resourceId: ticketResponse.id,
                    resourceCustomId: ticketResponse.customId,
                });
            }
        }

        return ticketResponse;
    }

    async updateStatus(
        accessProfile: AccessProfile,
        customId: string,
        ticketUpdate: UpdateTicketStatusDto,
    ) {
        return this.dataSource.transaction(async () => {
            const ticket = await this.findById(accessProfile, customId);
            const currentStatus = ticket.ticketStatus?.key || '';

            if (!ticket) {
                throw new CustomNotFoundException({
                    code: 'ticket-not-found',
                    message: 'Ticket not found.',
                });
            }

            const newStatus = await this.ticketStatusRepository.findOne({
                where: { key: ticketUpdate.status, tenantId: accessProfile.tenantId },
            });

            if (!newStatus) {
                throw new CustomNotFoundException({
                    code: 'status-not-found',
                    message: `Status with key '${ticketUpdate.status}' not found.`,
                });
            }

            await this.repository.update(ticket.id, { statusId: newStatus.id });
            if (ticketUpdate.status === TicketStatus.AwaitingVerification) {
                let timeSecondsInLastStatus = null;

                const lastStatusUpdate = await this.findLastStatusUpdate(
                    ticket.id,
                    TicketStatus.InProgress,
                );

                if (lastStatusUpdate) {
                    timeSecondsInLastStatus = this.calculateTimeInSeconds(
                        lastStatusUpdate.createdAt,
                        new Date(),
                    );
                }

                const fromDepartmentId = await this.getDepartmentIdFromUserId(
                    ticket.currentTargetUser.id,
                    accessProfile.tenantId,
                );

                await this.ticketUpdateRepository.save({
                    tenantId: accessProfile.tenantId,
                    ticketId: ticket.id,
                    ticketCustomId: ticket.customId,
                    performedById: ticket.currentTargetUser.id,
                    createdById: ticket.currentTargetUser.id,
                    updatedById: ticket.currentTargetUser.id,
                    action: TicketActionType.StatusUpdate,
                    fromStatus: TicketStatus.InProgress,
                    toStatus: TicketStatus.AwaitingVerification,
                    timeSecondsInLastStatus,
                    fromUserId: ticket.currentTargetUser.id,
                    toUserId: ticket.currentTargetUser.id,
                    fromDepartmentId,
                    toDepartmentId: fromDepartmentId,
                    description: '<p><span>user</span> enviou este ticket para verificação.</p>',
                });

                // Only notify reviewer if exists
                if (ticket.reviewer?.id) {
                    await this.notificationRepository.save({
                        tenantId: accessProfile.tenantId,
                        type: NotificationType.StatusUpdate,
                        message:
                            '<p><span>user</span> enviou a tarefa <span>resource</span> para verificação.</p>',
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
                        targetUserId: ticket.reviewer.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    });
                }

                // Only send email if reviewer exists
                if (ticket.reviewer?.email) {
                    const message = `<span style="font-weight: 600;">${ticket.currentTargetUser.firstName} ${ticket.currentTargetUser.lastName}</span> enviou a tarefa <span style="font-weight: 600;">${ticket.customId}</span> para verificação.`;

                    await this.sendEmailWithPermissionCheck(
                        accessProfile.tenantId,
                        `A tarefa ${ticket.customId} está pronta para verificação.`,
                        message,
                        ticket.reviewer.email,
                        ticket.customId,
                    );
                }
            } else if (
                ticketUpdate.status === TicketStatus.InProgress &&
                currentStatus === TicketStatus.AwaitingVerification
            ) {
                let timeSecondsInLastStatus = null;

                const lastStatusUpdate = await this.findLastStatusUpdate(
                    ticket.id,
                    TicketStatus.AwaitingVerification,
                );

                if (lastStatusUpdate) {
                    timeSecondsInLastStatus = this.calculateTimeInSeconds(
                        lastStatusUpdate.createdAt,
                        new Date(),
                    );
                }

                const fromDepartmentId = await this.getDepartmentIdFromUserId(
                    ticket.currentTargetUser.id,
                    accessProfile.tenantId,
                );

                await Promise.all([
                    this.ticketUpdateRepository.save({
                        tenantId: accessProfile.tenantId,
                        ticketId: ticket.id,
                        ticketCustomId: ticket.customId,
                        performedById: ticket.currentTargetUser.id,
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
                        action: TicketActionType.StatusUpdate,
                        fromStatus: TicketStatus.AwaitingVerification,
                        toStatus: TicketStatus.InProgress,
                        timeSecondsInLastStatus,
                        fromUserId: ticket.currentTargetUser.id,
                        toUserId: ticket.currentTargetUser.id,
                        fromDepartmentId,
                        toDepartmentId: fromDepartmentId,
                        description: '<p><span>user</span> cancelou o envio para verificação.</p>',
                    }),
                    this.notificationRepository.save({
                        tenantId: accessProfile.tenantId,
                        type: NotificationType.StatusUpdate,
                        message:
                            '<p><span>user</span> cancelou o envio da tarefa <span>resource</span> para verificação.</p>',
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
                        targetUserId: ticket.reviewer.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    }),
                ]);
            } else if (
                ticketUpdate.status === TicketStatus.UnderVerification &&
                currentStatus === TicketStatus.AwaitingVerification
            ) {
                let timeSecondsInLastStatus = null;

                const lastStatusUpdate = await this.findLastStatusUpdate(
                    ticket.id,
                    TicketStatus.AwaitingVerification,
                );

                if (lastStatusUpdate) {
                    timeSecondsInLastStatus = this.calculateTimeInSeconds(
                        lastStatusUpdate.createdAt,
                        new Date(),
                    );
                }

                const fromDepartmentId = await this.getDepartmentIdFromUserId(
                    ticket.currentTargetUser.id,
                    accessProfile.tenantId,
                );

                await this.ticketUpdateRepository.save({
                    tenantId: accessProfile.tenantId,
                    ticketId: ticket.id,
                    ticketCustomId: ticket.customId,
                    performedById: ticket.reviewer.id,
                    createdById: ticket.reviewer.id,
                    updatedById: ticket.reviewer.id,
                    action: TicketActionType.StatusUpdate,
                    fromStatus: TicketStatus.AwaitingVerification,
                    toStatus: TicketStatus.UnderVerification,
                    timeSecondsInLastStatus,
                    fromUserId: ticket.currentTargetUser.id,
                    toUserId: ticket.currentTargetUser.id,
                    fromDepartmentId,
                    toDepartmentId: fromDepartmentId,
                    description: '<p><span>user</span> iniciou a verificação da tarefa.</p>',
                });
            } else if (
                ticketUpdate.status === TicketStatus.InProgress &&
                currentStatus === TicketStatus.Returned
            ) {
                let timeSecondsInLastStatus = null;

                const lastStatusUpdate = await this.findLastStatusUpdate(
                    ticket.id,
                    TicketStatus.Returned,
                );

                if (lastStatusUpdate) {
                    timeSecondsInLastStatus = this.calculateTimeInSeconds(
                        lastStatusUpdate.createdAt,
                        new Date(),
                    );
                }

                const fromDepartmentId = await this.getDepartmentIdFromUserId(
                    ticket.currentTargetUser.id,
                    accessProfile.tenantId,
                );

                await Promise.all([
                    this.ticketUpdateRepository.save({
                        tenantId: accessProfile.tenantId,
                        ticketId: ticket.id,
                        ticketCustomId: ticket.customId,
                        performedById: ticket.currentTargetUser.id,
                        createdById: ticket.currentTargetUser.id,
                        updatedById: ticket.currentTargetUser.id,
                        action: TicketActionType.StatusUpdate,
                        fromStatus: TicketStatus.Returned,
                        toStatus: TicketStatus.InProgress,
                        timeSecondsInLastStatus,
                        fromUserId: ticket.currentTargetUser.id,
                        toUserId: ticket.currentTargetUser.id,
                        fromDepartmentId,
                        toDepartmentId: fromDepartmentId,
                        description: '<p><span>user</span> iniciou a correção da tarefa.</p>',
                    }),
                ]);
            }

            const updatedTicket = await this.findById(accessProfile, customId);

            return {
                message: 'Successfully updated!',
                ticketData: updatedTicket,
            };
        });
    }

    // protected async update(accessProfile: AccessProfile, id: number, data: QueryDeepPartialEntity<T>) {
    //     // if (!user.isAdmin) {
    //     //   const existing = await this.repository.findOne({ where: { id, tenantId: accessProfile.tenantId } as any });
    //     //   if (!existing) throw new Error('Unauthorized or not found');
    //     // }

    //     const existing = await this.repository.findOne({
    //         where: { id, tenantId: accessProfile.tenantId } as any,
    //     });
    //     if (!existing) throw new Error('Unauthorized or not found');

    //     return this.repository.update(id, data);
    // }

    async accept(accessProfile: AccessProfile, customId: string) {
        const ticketResponse = await this.findById(accessProfile, customId);

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        const inProgressStatus = await this.ticketStatusRepository.findOne({
            where: { key: TicketStatus.InProgress, tenantId: accessProfile.tenantId },
        });

        if (!inProgressStatus) {
            throw new CustomNotFoundException({
                code: 'status-not-found',
                message: `Status '${TicketStatus.InProgress}' not found.`,
            });
        }

        await this.repository.update(ticketResponse.id, {
            statusId: inProgressStatus.id,
            acceptedAt: new Date().toISOString(),
        });

        if (!ticketResponse) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found.',
            });
        }

        const { currentTargetUser, requester } = ticketResponse;

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticketResponse.id,
            TicketStatus.Pending,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            currentTargetUser.id,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: currentTargetUser.id,
            createdById: currentTargetUser.id,
            updatedById: currentTargetUser.id,
            action: TicketActionType.StatusUpdate,
            fromStatus: TicketStatus.Pending,
            toStatus: TicketStatus.InProgress,
            timeSecondsInLastStatus,
            fromUserId: currentTargetUser.id,
            toUserId: currentTargetUser.id,
            fromDepartmentId,
            toDepartmentId: fromDepartmentId,
            description: `<p><span>user</span> ${
                ticketResponse.requester.id === currentTargetUser.id
                    ? 'começou a trabalhar nesta tarefa'
                    : 'aceitou esta tarefa'
            }.</p>`,
        });

        if (ticketResponse.requester.id !== currentTargetUser.id) {
            await this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.StatusUpdate,
                message: '<p><span>user</span> aceitou a tarefa <span>resource</span>.</p>',
                createdById: currentTargetUser.id,
                updatedById: currentTargetUser.id,
                targetUserId: requester.id,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            });

            const message = `<span style="font-weight: 600;">${currentTargetUser.firstName} ${currentTargetUser.lastName}</span> aceitou a tarefa <span style="font-weight: 600;">${ticketResponse.customId}</span>.`;

            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `A tarefa ${ticketResponse.customId} foi aceita`,
                message,
                requester.email,
                ticketResponse.customId,
            );
        }

        // this.notificationService.sendNotification(requester.id, {
        //     type: NotificationType.StatusUpdated,
        //     message: `${targetUser.firstName} ${targetUser.lastName} aceitou o ticket #${ticketResponse.id}.`,
        //     resourceId: ticketResponse.id,
        // });

        return {
            message: 'Ticket accepted!',
            ticketId: customId,
        };
    }

    async approve(accessProfile: AccessProfile, customId: string) {
        const ticketResponse = await this.findById(accessProfile, customId);

        const completedStatus = await this.ticketStatusRepository.findOne({
            where: { key: TicketStatus.Completed, tenantId: accessProfile.tenantId },
        });

        if (!completedStatus) {
            throw new CustomNotFoundException({
                code: 'status-not-found',
                message: `Status '${TicketStatus.Completed}' not found.`,
            });
        }

        await this.repository.update(ticketResponse.id, {
            statusId: completedStatus.id,
            completedAt: new Date().toISOString(),
        });

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticketResponse.id,
            TicketStatus.UnderVerification,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            ticketResponse.currentTargetUser.id,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: ticketResponse.reviewer.id,
            createdById: ticketResponse.reviewer.id,
            updatedById: ticketResponse.reviewer.id,
            action: TicketActionType.Completion,
            fromStatus: TicketStatus.UnderVerification,
            toStatus: TicketStatus.Completed,
            timeSecondsInLastStatus,
            fromUserId: ticketResponse.currentTargetUser.id,
            toUserId: ticketResponse.currentTargetUser.id,
            fromDepartmentId,
            toDepartmentId: fromDepartmentId,
            description: '<p><span>user</span> aprovou esta tarefa.</p>',
        });

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticketResponse.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        const notifications = targetUsers.map((ticketTargetUser) =>
            this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.StatusUpdate,
                message: '<p><span>user</span> aprovou a tarefa <span>resource</span>.</p>',
                createdById: ticketResponse.reviewer.id,
                updatedById: ticketResponse.reviewer.id,
                targetUserId: ticketTargetUser.userId,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            }),
        );

        await Promise.all(notifications);

        const message = `<span style="font-weight: 600;">${ticketResponse.reviewer.firstName} ${ticketResponse.reviewer.lastName}</span> aprovou a tarefa <span style="font-weight: 600;">${ticketResponse.customId}</span>.`;

        for (const ticketTargetUser of targetUsers) {
            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `A tarefa ${ticketResponse.customId} foi aprovada.`,
                message,
                ticketTargetUser.user.email,
                ticketResponse.customId,
            );
        }

        return {
            message: 'Ticket successfully approved!',
            ticketId: customId,
        };
    }

    async reject(
        accessProfile: AccessProfile,
        customId: string,
        reasonDto: CreateTicketDisapprovalReasonDto,
    ) {
        const ticketResponse = await this.findById(accessProfile, customId);

        const rejectedStatus = await this.ticketStatusRepository.findOne({
            where: { key: TicketStatus.Rejected, tenantId: accessProfile.tenantId },
        });

        if (!rejectedStatus) {
            throw new CustomNotFoundException({
                code: 'status-not-found',
                message: `Status '${TicketStatus.Rejected}' not found.`,
            });
        }

        await this.repository.update(ticketResponse.id, {
            statusId: rejectedStatus.id,
            rejectedAt: new Date().toISOString(),
        });

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticketResponse.id,
            TicketStatus.UnderVerification,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            ticketResponse.currentTargetUser.id,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: ticketResponse.reviewer.id,
            createdById: ticketResponse.reviewer.id,
            updatedById: ticketResponse.reviewer.id,
            action: TicketActionType.StatusUpdate,
            fromStatus: ticketResponse.ticketStatus?.key || null,
            toStatus: TicketStatus.Rejected,
            timeSecondsInLastStatus,
            fromUserId: ticketResponse.currentTargetUser.id,
            toUserId: ticketResponse.currentTargetUser.id,
            fromDepartmentId,
            toDepartmentId: fromDepartmentId,
            description: `<p><span>user</span> reprovou esta tarefa.</p>`,
        });

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticketResponse.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        const disapprovalReasonText =
            reasonDto.reason === DisapprovalReason.Other
                ? ''
                : ` por ${formatSnakeToNaturalCase(reasonDto.reason)}`;

        const notifications = targetUsers.map((ticketTargetUser) =>
            this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.StatusUpdate,
                message: `<p><span>user</span> reprovou a tarefa <span>resource</span>${disapprovalReasonText}.</p>`,
                createdById: ticketResponse.reviewer.id,
                updatedById: ticketResponse.reviewer.id,
                targetUserId: ticketTargetUser.userId,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            }),
        );

        await Promise.all(notifications);

        await this.ticketDisapprovalReasonService.create(
            accessProfile,
            ticketResponse.id,
            ticketResponse.customId,
            reasonDto,
        );

        const emailDisapprovalReasonText =
            reasonDto.reason === DisapprovalReason.Other
                ? ''
                : ` por <span style="font-weight: 600;">${formatSnakeToNaturalCase(reasonDto.reason)}</span>`;

        const message = `<span style="font-weight: 600;">${ticketResponse.reviewer.firstName} ${ticketResponse.reviewer.lastName}</span> reprovou a tarefa <span style="font-weight: 600;">${ticketResponse.customId}</span>${emailDisapprovalReasonText}.`;

        for (const ticketTargetUser of targetUsers) {
            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `A tarefa ${ticketResponse.customId} foi reprovada.`,
                message,
                ticketTargetUser.user.email,
                ticketResponse.customId,
            );
        }

        const updatedTicket = await this.findById(accessProfile, customId);

        return updatedTicket;
    }

    async cancel(
        accessProfile: AccessProfile,
        customId: string,
        reasonDto: CreateTicketCancellationReasonDto,
    ) {
        const ticketResponse = await this.findById(accessProfile, customId);
        const { requester } = ticketResponse;

        if (accessProfile.userId !== requester.id) {
            throw new CustomForbiddenException({
                message: 'User not allowed to cancel this ticket.',
                code: 'user-not-allowed-to-cancel-ticket',
            });
        }

        const canceledStatus = await this.ticketStatusRepository.findOne({
            where: { key: TicketStatus.Canceled, tenantId: accessProfile.tenantId },
        });

        if (!canceledStatus) {
            throw new CustomNotFoundException({
                code: 'status-not-found',
                message: `Status '${TicketStatus.Canceled}' not found.`,
            });
        }

        await this.repository.update(ticketResponse.id, {
            statusId: canceledStatus.id,
            canceledAt: new Date(),
        });

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticketResponse.id,
            ticketResponse.ticketStatus?.key || '',
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            ticketResponse.currentTargetUser.id,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticketResponse.id,
            ticketCustomId: ticketResponse.customId,
            performedById: requester.id,
            createdById: requester.id,
            updatedById: requester.id,
            action: TicketActionType.Cancellation,
            fromStatus: ticketResponse.ticketStatus?.key || null,
            toStatus: TicketStatus.Canceled,
            timeSecondsInLastStatus,
            fromUserId: ticketResponse.currentTargetUser.id,
            toUserId: ticketResponse.currentTargetUser.id,
            fromDepartmentId,
            toDepartmentId: fromDepartmentId,
            description: `<p><span>user</span> cancelou esta tarefa.</p>`,
        });

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticketResponse.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        const reasonText =
            reasonDto.reason === CancellationReason.Other
                ? ''
                : ` por ${formatSnakeToNaturalCase(reasonDto.reason)}`;

        const notifications = targetUsers.map((ticketTargetUser) =>
            this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.Cancellation,
                message: `<p><span>user</span> cancelou a tarefa <span>resource</span>${reasonText}.</p>`,
                createdById: requester.id,
                updatedById: requester.id,
                targetUserId: ticketTargetUser.userId,
                resourceId: ticketResponse.id,
                resourceCustomId: ticketResponse.customId,
            }),
        );

        await Promise.all(notifications);

        // Create the cancellation reason directly
        await this.ticketCancellationReasonService.create(
            accessProfile,
            ticketResponse.id,
            ticketResponse.customId,
            reasonDto,
        );

        const emailReasonText =
            reasonDto.reason === CancellationReason.Other
                ? ''
                : ` por <span style="font-weight: 600;">${formatSnakeToNaturalCase(reasonDto.reason)}</span>`;

        const message = `<span style="font-weight: 600;">${ticketResponse.requester.firstName} ${ticketResponse.requester.lastName}</span> cancelou a tarefa <span style="font-weight: 600;">${ticketResponse.customId}</span>${emailReasonText}.`;

        for (const ticketTargetUser of targetUsers) {
            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `A tarefa ${ticketResponse.customId} foi cancelada.`,
                message,
                ticketTargetUser.user.email,
                ticketResponse.customId,
            );
        }

        const updatedTicket = await this.findById(accessProfile, customId);

        return updatedTicket;
    }

    async deleteTicket(accessProfile: AccessProfile, customId: string) {
        try {
            const entity = await this.repository.findOne({
                where: { customId, tenantId: accessProfile.tenantId } as any,
            });

            if (!entity) {
                throw new Error('Unauthorized or not found');
            }

            await this.repository.remove(entity);
        } catch (error) {
            throw new CustomNotFoundException({
                code: 'ticket-not-found',
                message: 'Ticket not found or already deleted',
            });
        }
    }

    private calculateTimeInSeconds(startDate: Date, endDate: Date): number {
        const diff = endDate.getTime() - startDate.getTime();
        return Math.floor(diff / 1000);
    }

    private async findLastStatusUpdate(ticketId: number, status: string): Promise<any> {
        return this.ticketUpdateRepository.findOne({
            where: {
                ticketId,
                toStatus: status,
            },
            order: {
                createdAt: 'DESC',
            },
        });
    }

    //TODO: refactor this so these methods are in a more proper place
    private async isEmailNotificationsEnabled(tenantId: number): Promise<boolean> {
        try {
            const permissions = await this.tenantSubscriptionService.getTenantPermissions(tenantId);
            return permissions.includes('email_notifications');
        } catch (error) {
            return false;
        }
    }

    private async sendEmailWithPermissionCheck(
        tenantId: number,
        subject: string,
        message: string,
        to: string,
        ticketCustomId?: string,
    ): Promise<void> {
        const emailNotificationsEnabled = await this.isEmailNotificationsEnabled(tenantId);
        if (emailNotificationsEnabled) {
            const ticketLink = ticketCustomId
                ? `${process.env.FRONTEND_URL}/minhas-tarefas?ticket=${ticketCustomId}`
                : undefined;

            this.emailService.sendMail({
                subject,
                html: this.emailService.compileTemplate('ticket-update', { message, ticketLink }),
                to,
            });
        }
    }

    async addFiles(accessProfile: AccessProfile, customId: string, files: string[]) {
        const ticket = await this.findOne(accessProfile, {
            where: { customId },
            relations: [
                'files',
                'cancellationReason',
                'disapprovalReason',
                'correctionRequests',
                'currentTargetUser',
                'ticketStatus',
            ],
        });

        if (!ticket) {
            throw new CustomNotFoundException({
                message: 'Ticket not found',
                code: 'ticket-not-found',
            });
        }

        const ticketFiles = files.map((url: string) => ({
            tenantId: accessProfile.tenantId,
            url,
            name: extractFileName(url),
            mimeType: extractMimeTypeFromUrl(url),
            ticketId: ticket.id,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
        }));

        await this.ticketFileRepository.save(this.ticketFileRepository.create(ticketFiles));

        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            ticket.currentTargetUser.id,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save(
            this.ticketUpdateRepository.create({
                tenantId: accessProfile.tenantId,
                ticketId: ticket.id,
                ticketCustomId: ticket.customId,
                performedById: accessProfile.userId,
                createdById: accessProfile.userId,
                updatedById: accessProfile.userId,
                action: TicketActionType.Update,
                fromStatus: ticket.ticketStatus?.key || null,
                toStatus: ticket.ticketStatus?.key || null,
                fromUserId: ticket.currentTargetUser.id,
                toUserId: ticket.currentTargetUser.id,
                fromDepartmentId,
                toDepartmentId: fromDepartmentId,
                description: `<p><span>user</span> adicionou ${files.length} arquivo(s) à tarefa.</p>`,
            }),
        );

        const updatedTicket = await this.findById(accessProfile, customId);

        return updatedTicket;
    }

    async findArchived(accessProfile: AccessProfile, options?: QueryOptions<Ticket>) {
        const user = await this.userRepository.findOne({
            where: { id: accessProfile.userId },
            relations: ['department', 'role'],
        });

        const qb = this.buildLightweightQueryBuilder(accessProfile.tenantId).andWhere(
            '(ticketStatus.key IN (:...terminalStatuses) OR (ticketStatus.key = :completedStatus AND ticket.completedAt < :sevenDaysAgo))',
            {
                terminalStatuses: [TicketStatus.Rejected, TicketStatus.Canceled],
                completedStatus: TicketStatus.Completed,
                sevenDaysAgo: (() => {
                    const date = new Date();
                    date.setDate(date.getDate() - 7);
                    return date;
                })(),
            },
        );

        const roleName = user?.role?.name || '';
        const isTenantAdmin = roleName === RoleName.TenantAdmin;
        const isSupervisor = roleName === RoleName.Supervisor;

        if (!isTenantAdmin) {
            if (isSupervisor && user?.departmentId) {
                qb.andWhere(
                    '(ticket.requesterId = :userId OR ticket.currentTargetUserId = :userId OR targetUser.departmentId = :departmentId)',
                    {
                        userId: accessProfile.userId,
                        departmentId: user.departmentId,
                    },
                );
            } else {
                qb.andWhere(
                    '(ticket.requesterId = :userId OR ticket.currentTargetUserId = :userId)',
                    {
                        userId: accessProfile.userId,
                    },
                );
            }
        }

        if (options?.where) {
            if (options.where.name) {
                qb.andWhere('(ticket.name ILIKE :name OR ticket.customId ILIKE :name)', {
                    name: `%${options.where.name}%`,
                });
            }
        }
        this.applySorting(qb, options?.order);

        const page = options?.page || 1;
        const limit = options?.limit || 10;
        qb.skip((page - 1) * limit).take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async requestCorrection(
        accessProfile: AccessProfile,
        customId: string,
        dto: CreateCorrectionRequestDto,
    ) {
        const ticket = await this.findById(accessProfile, customId);

        if (!ticket) {
            throw new CustomNotFoundException({
                message: 'Ticket not found',
                code: 'ticket-not-found',
            });
        }

        if (ticket.ticketStatus?.key !== TicketStatus.UnderVerification) {
            throw new CustomForbiddenException({
                message: 'Ticket must be under verification to request a correction',
                code: 'ticket-not-under-verification',
            });
        }

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
        });

        let targetUserId: number;
        if (dto.targetUserId && targetUsers.length > 1) {
            const isValidTargetUser = targetUsers.some((tu) => tu.userId === dto.targetUserId);
            if (!isValidTargetUser) {
                throw new CustomForbiddenException({
                    message: 'Invalid target user for correction',
                    code: 'invalid-target-user',
                });
            }
            targetUserId = dto.targetUserId;
        } else {
            targetUserId = ticket.currentTargetUserId;
        }

        const returnedStatus = await this.ticketStatusRepository.findOne({
            where: { key: TicketStatus.Returned, tenantId: accessProfile.tenantId },
        });

        if (!returnedStatus) {
            throw new CustomNotFoundException({
                code: 'status-not-found',
                message: `Status '${TicketStatus.Returned}' not found.`,
            });
        }

        await this.repository.update(ticket.id, {
            statusId: returnedStatus.id,
            currentTargetUserId: targetUserId,
        });

        const lastStatusUpdate = await this.findLastStatusUpdate(
            ticket.id,
            TicketStatus.UnderVerification,
        );
        let timeSecondsInLastStatus = null;

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            ticket.currentTargetUser.id,
            accessProfile.tenantId,
        );

        const toDepartmentId = await this.getDepartmentIdFromUserId(
            targetUserId,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.StatusUpdate,
            fromStatus: TicketStatus.UnderVerification,
            toStatus: TicketStatus.Returned,
            timeSecondsInLastStatus,
            fromUserId: ticket.currentTargetUser.id,
            toUserId: targetUserId,
            fromDepartmentId,
            toDepartmentId,
            description: `<p><span>user</span> devolveu esta tarefa para correção.</p>`,
        });

        const correctionReasonText =
            dto.reason === CorrectionReason.Other
                ? ''
                : ` por ${formatSnakeToNaturalCase(dto.reason)}`;

        const notifications = targetUsers.map((ticketTargetUser) =>
            this.notificationRepository.save({
                tenantId: accessProfile.tenantId,
                type: NotificationType.CorrectionRequest,
                message: `<p><span>user</span> solicitou uma correção na tarefa <span>resource</span>${correctionReasonText}.</p>`,
                createdById: accessProfile.userId,
                updatedById: accessProfile.userId,
                targetUserId: ticketTargetUser.userId,
                resourceId: ticket.id,
                resourceCustomId: ticket.customId,
            }),
        );

        await Promise.all(notifications);

        await this.correctionRequestService.create(
            accessProfile,
            ticket.id,
            ticket.customId,
            targetUserId,
            dto,
        );

        const reviewer = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        const targetUser = await this.userRepository.findOne({
            where: { id: targetUserId, tenantId: accessProfile.tenantId },
        });

        if (reviewer && targetUser) {
            const emailCorrectionReasonText =
                dto.reason === CorrectionReason.Other
                    ? ''
                    : ` por <span style="font-weight: 600;">${formatSnakeToNaturalCase(dto.reason)}</span>`;

            const message = `<span style="font-weight: 600;">${reviewer.firstName} ${reviewer.lastName}</span> solicitou uma correção na tarefa <span style="font-weight: 600;">${ticket.customId}</span>${emailCorrectionReasonText}.`;

            for (const ticketTargetUser of targetUsers) {
                await this.sendEmailWithPermissionCheck(
                    accessProfile.tenantId,
                    `Uma correção foi solicitada na tarefa ${ticket.customId}.`,
                    message,
                    ticketTargetUser.user.email,
                    ticket.customId,
                );
            }
        }

        return this.findById(accessProfile, customId);
    }

    async updateAssignee(
        accessProfile: AccessProfile,
        customId: string,
        newTargetUserId: number,
        order: number,
    ) {
        const ticket = await this.findById(accessProfile, customId);

        const newTargetUser = await this.userRepository.findOne({
            where: {
                id: newTargetUserId,
                tenantId: accessProfile.tenantId,
                isActive: true,
            },
        });

        if (!newTargetUser) {
            throw new CustomNotFoundException({
                message: 'Target user not found or inactive',
                code: 'target-user-not-found',
            });
        }

        const assigningUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (!assigningUser) {
            throw new CustomNotFoundException({
                message: 'Assigning user not found',
                code: 'assigning-user-not-found',
            });
        }

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
            order: { order: 'ASC' },
        });

        if (order < 1 || order > targetUsers.length) {
            throw new CustomForbiddenException({
                message: 'Invalid order position',
                code: 'invalid-order-position',
            });
        }

        const targetUserToReplace = targetUsers.find((tu) => tu.order === order);
        if (!targetUserToReplace) {
            throw new CustomNotFoundException({
                message: 'Target user at specified order not found',
                code: 'target-user-order-not-found',
            });
        }

        await this.ticketTargetUserRepository.update(
            { id: targetUserToReplace.id },
            { userId: newTargetUserId },
        );

        if (ticket.currentTargetUserId === targetUserToReplace.userId) {
            await this.repository.update(ticket.id, {
                currentTargetUserId: newTargetUserId,
            });
        }

        //Is only possible to update the assignee if the ticket is pending
        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            targetUserToReplace.userId,
            accessProfile.tenantId,
        );

        const toDepartmentId = await this.getDepartmentIdFromUserId(
            newTargetUserId,
            accessProfile.tenantId,
        );
        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.AssigneeChange,
            fromStatus: TicketStatus.Pending,
            toStatus: TicketStatus.Pending,
            fromUserId: targetUserToReplace.userId,
            toUserId: newTargetUserId,
            fromDepartmentId,
            toDepartmentId,
            description: `<p><span>user</span> substituiu ${targetUserToReplace.user.firstName} ${targetUserToReplace.user.lastName} por ${newTargetUser.firstName} ${newTargetUser.lastName}.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> atribuiu a tarefa a você.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: newTargetUserId,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> removeu você da tarefa <span>resource</span>.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: targetUserToReplace.userId,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        return ticket;
    }

    async addAssignee(
        accessProfile: AccessProfile,
        customId: string,
        newTargetUserId: number,
        order?: number,
    ) {
        const ticket = await this.findById(accessProfile, customId);

        const newTargetUser = await this.userRepository.findOne({
            where: {
                id: newTargetUserId,
                tenantId: accessProfile.tenantId,
                isActive: true,
            },
        });

        if (!newTargetUser) {
            throw new CustomNotFoundException({
                message: 'Target user not found or inactive',
                code: 'target-user-not-found',
            });
        }

        const assigningUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (!assigningUser) {
            throw new CustomNotFoundException({
                message: 'Assigning user not found',
                code: 'assigning-user-not-found',
            });
        }

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
            order: { order: 'ASC' },
        });

        // Check if user is already a target user
        const existingTargetUser = targetUsers.find((tu) => tu.userId === newTargetUserId);
        if (existingTargetUser) {
            throw new CustomForbiddenException({
                message: 'User is already assigned to this ticket',
                code: 'user-already-assigned',
            });
        }

        // Determine the order - if not provided, add at the end
        let targetOrder: number;
        if (order !== undefined && order !== null) {
            if (order < 1 || order > targetUsers.length + 1) {
                throw new CustomForbiddenException({
                    message: 'Invalid order position',
                    code: 'invalid-order-position',
                });
            }
            targetOrder = order;
            // Shift existing users if inserting in the middle
            if (order <= targetUsers.length) {
                await this.ticketTargetUserRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                        order: () => '"order" + 1',
                    })
                    .where('ticketId = :ticketId', { ticketId: ticket.id })
                    .andWhere('tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                    .andWhere('"order" >= :order', { order })
                    .execute();
            }
        } else {
            targetOrder = targetUsers.length + 1;
        }

        // Create new target user
        const newTargetUserEntity = this.ticketTargetUserRepository.create({
            ticketId: ticket.id,
            userId: newTargetUserId,
            order: targetOrder,
            tenantId: accessProfile.tenantId,
        });

        await this.ticketTargetUserRepository.save(newTargetUserEntity);

        // Create ticket update
        const toDepartmentId = await this.getDepartmentIdFromUserId(
            newTargetUserId,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.AssigneeChange,
            fromStatus: ticket.ticketStatus?.key,
            toStatus: ticket.ticketStatus?.key,
            fromUserId: null,
            toUserId: newTargetUserId,
            fromDepartmentId: null,
            toDepartmentId,
            description: `<p><span>user</span> adicionou ${newTargetUser.firstName} ${newTargetUser.lastName} como responsável.</p>`,
        });

        // Send notification to the new target user
        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> atribuiu a tarefa <span>resource</span> a você.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: newTargetUserId,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        return this.findById(accessProfile, customId);
    }

    async removeAssignee(
        accessProfile: AccessProfile,
        customId: string,
        targetUserIdToRemove: number,
    ) {
        const ticket = await this.findById(accessProfile, customId);

        // Check if user is the requester
        if (accessProfile.userId !== ticket.requester.id) {
            throw new CustomForbiddenException({
                message: 'Only the requester can remove target users',
                code: 'only-requester-can-remove',
            });
        }

        // Check if ticket is pending
        const currentStatus = ticket.ticketStatus?.key || '';
        if (currentStatus !== TicketStatus.Pending) {
            throw new CustomForbiddenException({
                message: 'Can only remove target users when ticket is pending',
                code: 'ticket-not-pending',
            });
        }

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
            order: { order: 'ASC' },
        });

        // Check if there are at least 2 target users
        if (targetUsers.length < 2) {
            throw new CustomForbiddenException({
                message: 'Cannot remove target user. Ticket must have at least 2 target users.',
                code: 'insufficient-target-users',
            });
        }

        const targetUserToRemove = targetUsers.find((tu) => tu.userId === targetUserIdToRemove);
        if (!targetUserToRemove) {
            throw new CustomNotFoundException({
                message: 'Target user not found',
                code: 'target-user-not-found',
            });
        }

        const currentTargetUser = targetUsers.find(
            (tu) => tu.userId === ticket.currentTargetUserId,
        );
        if (!currentTargetUser) {
            throw new CustomNotFoundException({
                message: 'Current target user not found',
                code: 'current-target-user-not-found',
            });
        }

        const isRemovingCurrentTargetUser = ticket.currentTargetUserId === targetUserIdToRemove;
        const isLastTargetUser =
            targetUserToRemove.order === targetUsers[targetUsers.length - 1].order;

        // If not removing current target user, check if user has already worked
        if (!isRemovingCurrentTargetUser && targetUserToRemove.order < currentTargetUser.order) {
            throw new CustomForbiddenException({
                message: 'Cannot remove target user who has already worked on the task',
                code: 'cannot-remove-user-who-worked',
            });
        }

        const removedUser = targetUserToRemove.user;

        // If removing current target user, find next user BEFORE reordering
        let nextUserToAssign: (typeof targetUsers)[0] | null = null;
        if (isRemovingCurrentTargetUser && !isLastTargetUser) {
            // Find the user that had order = currentTargetUser.order + 1
            nextUserToAssign = targetUsers.find((tu) => tu.order === currentTargetUser.order + 1);
        }

        // Delete the target user
        await this.ticketTargetUserRepository.delete({
            id: targetUserToRemove.id,
            tenantId: accessProfile.tenantId,
        });

        // Reorder remaining target users
        const remainingTargetUsers = targetUsers.filter((tu) => tu.id !== targetUserToRemove.id);
        for (let i = 0; i < remainingTargetUsers.length; i++) {
            remainingTargetUsers[i].order = i + 1;
        }

        await this.ticketTargetUserRepository.save(remainingTargetUsers);

        // If removing current target user, handle automatic forwarding
        if (isRemovingCurrentTargetUser) {
            if (isLastTargetUser) {
                // Assign to the last remaining target user and send to verification
                const lastRemainingUser = remainingTargetUsers[remainingTargetUsers.length - 1];

                if (!lastRemainingUser) {
                    throw new CustomNotFoundException({
                        message: 'No remaining target users found',
                        code: 'no-remaining-users',
                    });
                }

                // Send to verification (reviewer should already be set by frontend)
                const awaitingVerificationStatus = await this.ticketStatusRepository.findOne({
                    where: {
                        key: TicketStatus.AwaitingVerification,
                        tenantId: accessProfile.tenantId,
                    },
                });

                if (!awaitingVerificationStatus) {
                    throw new CustomNotFoundException({
                        code: 'status-not-found',
                        message: `Status '${TicketStatus.AwaitingVerification}' not found.`,
                    });
                }

                await this.repository.update(ticket.id, {
                    currentTargetUserId: lastRemainingUser.userId,
                    statusId: awaitingVerificationStatus.id,
                });

                // Create ticket update for status change
                const fromDepartmentId = await this.getDepartmentIdFromUserId(
                    removedUser.id,
                    accessProfile.tenantId,
                );

                const toDepartmentId = await this.getDepartmentIdFromUserId(
                    lastRemainingUser.userId,
                    accessProfile.tenantId,
                );

                await this.ticketUpdateRepository.save({
                    tenantId: accessProfile.tenantId,
                    ticketId: ticket.id,
                    ticketCustomId: ticket.customId,
                    performedById: accessProfile.userId,
                    createdById: accessProfile.userId,
                    updatedById: accessProfile.userId,
                    action: TicketActionType.StatusUpdate,
                    fromStatus: TicketStatus.Pending,
                    toStatus: TicketStatus.AwaitingVerification,
                    fromUserId: removedUser.id,
                    toUserId: lastRemainingUser.userId,
                    fromDepartmentId,
                    toDepartmentId,
                    description: `<p><span>user</span> removeu ${removedUser.firstName} ${removedUser.lastName} como responsável e enviou a tarefa para verificação.</p>`,
                });

                // Notify reviewer if exists
                if (ticket.reviewer?.id) {
                    await this.notificationRepository.save({
                        tenantId: accessProfile.tenantId,
                        type: NotificationType.TicketUpdate,
                        message: `<p>A tarefa <span>resource</span> foi enviada para verificação.</p>`,
                        createdById: accessProfile.userId,
                        updatedById: accessProfile.userId,
                        targetUserId: ticket.reviewer.id,
                        resourceId: ticket.id,
                        resourceCustomId: ticket.customId,
                    });
                }
            } else {
                // Send to next target user
                // Use the user we found before reordering
                if (!nextUserToAssign) {
                    throw new CustomNotFoundException({
                        message: 'Next target user not found',
                        code: 'next-target-user-not-found',
                    });
                }

                // Find the same user in remainingTargetUsers (after reordering)
                const userToAssign = remainingTargetUsers.find(
                    (tu) => tu.userId === nextUserToAssign!.userId,
                );

                if (!userToAssign) {
                    throw new CustomNotFoundException({
                        message: 'Next target user not found in remaining users',
                        code: 'next-target-user-not-found-after-reorder',
                    });
                }

                const pendingStatus = await this.ticketStatusRepository.findOne({
                    where: { key: TicketStatus.Pending, tenantId: accessProfile.tenantId },
                });

                if (!pendingStatus) {
                    throw new CustomNotFoundException({
                        code: 'status-not-found',
                        message: `Status '${TicketStatus.Pending}' not found.`,
                    });
                }

                await this.repository.update(ticket.id, {
                    currentTargetUserId: userToAssign.userId,
                    statusId: pendingStatus.id,
                });

                // Create ticket update
                const fromDepartmentId = await this.getDepartmentIdFromUserId(
                    removedUser.id,
                    accessProfile.tenantId,
                );

                await this.ticketUpdateRepository.save({
                    tenantId: accessProfile.tenantId,
                    ticketId: ticket.id,
                    ticketCustomId: ticket.customId,
                    performedById: accessProfile.userId,
                    createdById: accessProfile.userId,
                    updatedById: accessProfile.userId,
                    action: TicketActionType.AssigneeChange,
                    fromStatus: TicketStatus.Pending,
                    toStatus: TicketStatus.Pending,
                    fromUserId: removedUser.id,
                    toUserId: userToAssign.userId,
                    fromDepartmentId,
                    description: `<p><span>user</span> removeu ${removedUser.firstName} ${removedUser.lastName} como responsável e enviou a tarefa para ${userToAssign.user.firstName} ${userToAssign.user.lastName}.</p>`,
                });

                // Notify next user
                await this.notificationRepository.save({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.TicketUpdate,
                    message: `<p><span>user</span> enviou a tarefa <span>resource</span> para você.</p>`,
                    createdById: accessProfile.userId,
                    updatedById: accessProfile.userId,
                    targetUserId: userToAssign.userId,
                    resourceId: ticket.id,
                    resourceCustomId: ticket.customId,
                });
            }
        } else {
            // Create ticket update for regular removal
            const fromDepartmentId = await this.getDepartmentIdFromUserId(
                removedUser.id,
                accessProfile.tenantId,
            );

            await this.ticketUpdateRepository.save({
                tenantId: accessProfile.tenantId,
                ticketId: ticket.id,
                ticketCustomId: ticket.customId,
                performedById: accessProfile.userId,
                createdById: accessProfile.userId,
                updatedById: accessProfile.userId,
                action: TicketActionType.AssigneeRemove,
                fromStatus: ticket.ticketStatus?.key || null,
                toStatus: ticket.ticketStatus?.key || null,
                fromUserId: removedUser.id,
                toUserId: null,
                fromDepartmentId,
                description: `<p><span>user</span> removeu ${removedUser.firstName} ${removedUser.lastName} como responsável.</p>`,
            });
        }

        return this.findById(accessProfile, customId);
    }

    async sendToNextDepartment(accessProfile: AccessProfile, customId: string) {
        const ticket = await this.findById(accessProfile, customId);

        if (!ticket) {
            throw new CustomNotFoundException({
                message: 'Ticket not found',
                code: 'ticket-not-found',
            });
        }

        if (accessProfile.userId !== ticket.currentTargetUserId) {
            throw new CustomForbiddenException({
                message: 'Only the current target user can send ticket to next department',
                code: 'not-current-target-user',
            });
        }

        const targetUsers = await this.ticketTargetUserRepository.find({
            where: { ticketId: ticket.id, tenantId: accessProfile.tenantId },
            relations: ['user'],
            order: { order: 'ASC' },
        });

        const currentUserPosition = targetUsers.find(
            (tu) => tu.userId === ticket.currentTargetUserId,
        );
        if (!currentUserPosition) {
            throw new CustomNotFoundException({
                message: 'Current target user not found in target users list',
                code: 'current-target-user-not-found',
            });
        }

        const nextUser = targetUsers.find((tu) => tu.order === currentUserPosition.order + 1);
        if (!nextUser) {
            throw new CustomForbiddenException({
                message: 'No next department available',
                code: 'no-next-target-user',
            });
        }

        const currentUserEntity = await this.userRepository.findOne({
            where: { id: ticket.currentTargetUserId, tenantId: accessProfile.tenantId },
            relations: ['department'],
        });

        const nextUserEntity = await this.userRepository.findOne({
            where: { id: nextUser.userId, tenantId: accessProfile.tenantId },
            relations: ['department'],
        });

        const isNextUserSameDepartment =
            currentUserEntity?.departmentId !== null &&
            nextUserEntity?.departmentId !== null &&
            currentUserEntity.departmentId === nextUserEntity.departmentId;

        const departmentText = isNextUserSameDepartment ? 'colaborador' : 'setor';

        const pendingStatus = await this.ticketStatusRepository.findOne({
            where: { key: TicketStatus.Pending, tenantId: accessProfile.tenantId },
        });

        if (!pendingStatus) {
            throw new CustomNotFoundException({
                code: 'status-not-found',
                message: `Status '${TicketStatus.Pending}' not found.`,
            });
        }

        const fromStatus = ticket.ticketStatus?.key || TicketStatus.InProgress;
        let timeSecondsInLastStatus = null;

        const lastStatusUpdate = await this.findLastStatusUpdate(ticket.id, fromStatus);

        if (lastStatusUpdate) {
            timeSecondsInLastStatus = this.calculateTimeInSeconds(
                lastStatusUpdate.createdAt,
                new Date(),
            );
        }

        await this.repository.update(ticket.id, {
            currentTargetUserId: nextUser.userId,
            statusId: pendingStatus.id,
        });

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.AssigneeChange,
            fromStatus,
            toStatus: TicketStatus.Pending,
            timeSecondsInLastStatus,
            fromUserId: ticket.currentTargetUserId,
            toUserId: nextUser.userId,
            description: `<p><span>user</span> enviou esta tarefa para o próximo ${departmentText}.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> enviou a tarefa <span>resource</span> para você.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: nextUser.userId,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        for (const targetUser of targetUsers) {
            if (
                targetUser.userId !== nextUser.userId &&
                targetUser.userId !== accessProfile.userId
            ) {
                await this.notificationRepository.save({
                    tenantId: accessProfile.tenantId,
                    type: NotificationType.TicketUpdate,
                    message: `<p><span>user</span> enviou a tarefa <span>resource</span> para o próximo ${departmentText}.</p>`,
                    createdById: accessProfile.userId,
                    updatedById: accessProfile.userId,
                    targetUserId: targetUser.userId,
                    resourceId: ticket.id,
                    resourceCustomId: ticket.customId,
                });
            }
        }

        const currentUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        const nextUserDetails = await this.userRepository.findOne({
            where: { id: nextUser.userId, tenantId: accessProfile.tenantId },
        });

        if (currentUser && nextUserDetails) {
            const message = `<span style="font-weight: 600;">${currentUser.firstName} ${currentUser.lastName}</span> enviou a tarefa <span style="font-weight: 600;">${ticket.customId}</span> para o próximo ${departmentText}.`;

            await this.sendEmailWithPermissionCheck(
                accessProfile.tenantId,
                `A tarefa ${ticket.customId} foi enviada para você.`,
                message,
                nextUserDetails.email,
                ticket.customId,
            );

            for (const targetUser of targetUsers) {
                if (
                    targetUser.userId !== nextUser.userId &&
                    targetUser.userId !== accessProfile.userId
                ) {
                    await this.sendEmailWithPermissionCheck(
                        accessProfile.tenantId,
                        `A tarefa ${ticket.customId} foi enviada para o próximo ${departmentText}.`,
                        message,
                        targetUser.user.email,
                        ticket.customId,
                    );
                }
            }
        }

        return this.findById(accessProfile, customId);
    }

    async updateReviewer(accessProfile: AccessProfile, customId: string, newReviewerId: number) {
        const ticket = await this.findById(accessProfile, customId);

        const newReviewer = await this.userRepository.findOne({
            where: {
                id: newReviewerId,
                tenantId: accessProfile.tenantId,
                isActive: true,
            },
        });

        if (!newReviewer) {
            throw new CustomNotFoundException({
                message: 'Reviewer not found or inactive',
                code: 'reviewer-not-found',
            });
        }

        const assigningUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (!assigningUser) {
            throw new CustomNotFoundException({
                message: 'Assigning user not found',
                code: 'assigning-user-not-found',
            });
        }

        await this.repository.update(ticket.id, {
            reviewerId: newReviewerId,
        });

        const fromDepartmentId = await this.getDepartmentIdFromUserId(
            ticket.currentTargetUser.id,
            accessProfile.tenantId,
        );

        await this.ticketUpdateRepository.save({
            tenantId: accessProfile.tenantId,
            ticketId: ticket.id,
            ticketCustomId: ticket.customId,
            performedById: accessProfile.userId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            action: TicketActionType.Update,
            fromStatus: ticket.ticketStatus?.key || null,
            toStatus: ticket.ticketStatus?.key || null,
            fromUserId: ticket.currentTargetUser.id,
            toUserId: ticket.currentTargetUser.id,
            fromDepartmentId,
            toDepartmentId: fromDepartmentId,
            description: `<p><span>user</span> definiu ${newReviewer.firstName} ${newReviewer.lastName} como revisor desta tarefa.</p>`,
        });

        await this.notificationRepository.save({
            tenantId: accessProfile.tenantId,
            type: NotificationType.TicketUpdate,
            message: `<p><span>user</span> definiu você como revisor da tarefa <span>resource</span>.</p>`,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            targetUserId: newReviewer.id,
            resourceId: ticket.id,
            resourceCustomId: ticket.customId,
        });

        return ticket;
    }

    async executeCustomStatusAction(
        accessProfile: AccessProfile,
        customId: string,
        actionId: number,
    ): Promise<Ticket> {
        return this.dataSource.transaction(async () => {
            // Find ticket with status relation
            const ticket = await this.ticketRepository.findOne({
                where: {
                    customId,
                    tenantId: accessProfile.tenantId,
                },
                relations: ['ticketStatus', 'currentTargetUser'],
            });

            if (!ticket) {
                throw new CustomNotFoundException({
                    code: 'ticket-not-found',
                    message: 'Ticket not found.',
                });
            }

            // Find the action with relations
            const action = await this.statusActionRepository.findOne({
                where: {
                    id: actionId,
                    tenantId: accessProfile.tenantId,
                },
                relations: ['fromStatus', 'toStatus'],
            });

            if (!action) {
                throw new CustomNotFoundException({
                    code: 'action-not-found',
                    message: 'Status action not found.',
                });
            }

            // Validate that the ticket's current status matches the action's fromStatus
            if (ticket.statusId !== action.fromStatusId) {
                throw new CustomForbiddenException({
                    code: 'invalid-status-for-action',
                    message: `This action cannot be executed from the current status. Expected status ID: ${action.fromStatusId}, but ticket has status ID: ${ticket.statusId}`,
                });
            }

            // Validate that the action's fromStatus is not a default status
            // Default statuses should use existing endpoints (approve, reject, cancel, etc.)
            const fromStatus = await this.ticketStatusRepository.findOne({
                where: { id: action.fromStatusId },
            });

            if (fromStatus?.isDefault) {
                throw new CustomForbiddenException({
                    code: 'default-status-action',
                    message: 'Default status actions should use their dedicated endpoints.',
                });
            }

            if (!action.toStatusId) {
                throw new CustomForbiddenException({
                    code: 'missing-target-status',
                    message: 'This action does not have a target status configured.',
                });
            }

            // Calculate time in last status
            // findLastStatusUpdate expects a status string (key), so we use the status key
            const lastStatusUpdate = await this.findLastStatusUpdate(
                ticket.id,
                fromStatus?.key || '',
            );
            let timeSecondsInLastStatus = null;

            if (lastStatusUpdate) {
                timeSecondsInLastStatus = this.calculateTimeInSeconds(
                    lastStatusUpdate.createdAt,
                    new Date(),
                );
            }

            // Update ticket status
            await this.ticketRepository.update(ticket.id, {
                statusId: action.toStatusId,
            });

            // Create ticket update record
            const fromDepartmentId = await this.getDepartmentIdFromUserId(
                ticket.currentTargetUserId || null,
                accessProfile.tenantId,
            );

            await this.ticketUpdateRepository.save({
                tenantId: accessProfile.tenantId,
                ticketId: ticket.id,
                ticketCustomId: ticket.customId,
                performedById: accessProfile.userId,
                createdById: accessProfile.userId,
                updatedById: accessProfile.userId,
                action: TicketActionType.StatusUpdate,
                fromStatus: fromStatus?.key || '',
                toStatus: action.toStatus?.key || '',
                timeSecondsInLastStatus,
                fromUserId: ticket.currentTargetUserId || null,
                toUserId: ticket.currentTargetUserId || null,
                fromDepartmentId,
                toDepartmentId: fromDepartmentId,
                description: `<p><span>user</span> executou a ação "${action.title}".</p>`,
            });

            // Return updated ticket
            return this.findById(accessProfile, customId);
        });
    }
}
