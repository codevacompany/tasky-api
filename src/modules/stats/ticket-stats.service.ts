import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    endOfDay,
    endOfMonth,
    endOfQuarter,
    endOfWeek,
    getQuarter,
    startOfDay,
    startOfMonth,
    startOfQuarter,
    startOfWeek,
    subDays,
    subMonths,
    subQuarters,
    subWeeks,
} from 'date-fns';
import { In, IsNull, LessThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { QueryOptions } from '../../shared/types/http';
import { BusinessHoursService } from '../../shared/services/business-hours.service';
import { DepartmentService } from '../department/department.service';
import { User } from '../user/entities/user.entity';
import { TicketUpdate } from '../ticket-updates/entities/ticket-update.entity';
import { Ticket, TicketPriority, TicketStatus } from '../ticket/entities/ticket.entity';
import { ResolutionTimeResponseDto } from './dtos/resolution-time.dto';
import {
    StatusDurationDto,
    StatusDurationResponseDto,
    StatusDurationTimeSeriesResponseDto,
    StatusDurationTimePointDto,
} from './dtos/status-duration.dto';
import {
    TicketPriorityCountDto,
    TicketPriorityCountResponseDto,
} from './dtos/ticket-priority-count.dto';
import { DepartmentStatsDto, TicketStatsResponseDto } from './dtos/ticket-stats-response.dto';
import { TicketStatusCountDto, TicketStatusCountResponseDto } from './dtos/ticket-status-count.dto';
import { TicketTrendsResponseDto, TrendDataPointDto } from './dtos/ticket-trends.dto';
import { UserRankingItemDto, UserRankingResponseDto } from './dtos/user-ranking.dto';
import { PerformanceTrendsResponseDto } from './dtos/performance-trends.dto';
import { TicketStats } from './entities/ticket-stats.entity';
import { StatsPeriod } from './stats.controller';
import { RoleService } from '../role/role.service';
import { RoleName } from '../role/entities/role.entity';

@Injectable()
export class TicketStatsService {
    constructor(
        @InjectRepository(TicketStats)
        private readonly ticketStatsRepository: Repository<TicketStats>,
        private readonly departmentService: DepartmentService,
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>,
        @InjectRepository(TicketUpdate)
        private readonly ticketUpdateRepository: Repository<TicketUpdate>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly businessHoursService: BusinessHoursService,
        private readonly roleService: RoleService,
    ) {}

    /**
     * Helper method to check if user is a Supervisor and get their departmentId
     * @returns departmentId if user is Supervisor, null otherwise
     */
    private async getSupervisorDepartmentId(accessProfile: AccessProfile): Promise<number | null> {
        const user = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
        });

        if (!user) return null;

        const role = await this.roleService.findById(user.roleId);
        if (!role || role.name !== RoleName.Supervisor) return null;

        return user.departmentId;
    }

    /**
     * Helper method to get period filter configuration based on StatsPeriod
     * Centralizes the period filter logic to avoid repetition (DRY principle)
     * @param period - The stats period to filter by
     * @returns Object containing dateFilter (for TypeORM find), startDate (for query builders), limit, and order
     */
    private getPeriodFilter(period: StatsPeriod = StatsPeriod.ALL): {
        dateFilter: Record<string, any>;
        startDate: Date | null;
        limit?: number;
        order?: Record<string, 'ASC' | 'DESC'>;
    } {
        const now = new Date();
        let dateFilter: Record<string, any> = {};
        let startDate: Date | null = null;
        let limit: number | undefined = undefined;
        let order: Record<string, 'ASC' | 'DESC'> | undefined = undefined;

        switch (period) {
            case StatsPeriod.WEEKLY:
                startDate = startOfDay(subDays(now, 7));
                dateFilter = { createdAt: MoreThanOrEqual(startDate) };
                break;
            case StatsPeriod.MONTHLY:
                startDate = startOfDay(subDays(now, 30));
                dateFilter = { createdAt: MoreThanOrEqual(startDate) };
                break;
            case StatsPeriod.TRIMESTRAL:
                startDate = startOfDay(subMonths(now, 3));
                dateFilter = { createdAt: MoreThanOrEqual(startDate) };
                break;
            case StatsPeriod.SEMESTRAL:
                startDate = startOfDay(subMonths(now, 6));
                dateFilter = { createdAt: MoreThanOrEqual(startDate) };
                break;
            case StatsPeriod.ANNUAL:
                startDate = startOfDay(subMonths(now, 12));
                dateFilter = { createdAt: MoreThanOrEqual(startDate) };
                break;
            case StatsPeriod.ALL:
            default:
                // For ALL period, some methods use limit/order instead of date filter
                limit = 50;
                order = { createdAt: 'DESC' };
                break;
        }

        return { dateFilter, startDate, limit, order };
    }

    async findMany(accessProfile: AccessProfile, options?: QueryOptions<TicketStats>) {
        const filters = {
            ...options,
            where: {
                ...(options?.where || {}),
                tenantId: accessProfile.tenantId,
            },
            order: { createdAt: 'DESC' } as any,
        };

        const [items, total] = await this.ticketStatsRepository.findAndCount(filters);

        return {
            items,
            total,
            page: options?.page || 1,
            limit: options?.limit || total,
            totalPages: options?.limit ? Math.ceil(total / options.limit) : 1,
        };
    }

    async findByTicketId(accessProfile: AccessProfile, ticketId: number): Promise<TicketStats> {
        return this.ticketStatsRepository.findOne({
            where: { ticketId, tenantId: accessProfile.tenantId },
        });
    }

    async getTenantStats(
        accessProfile: AccessProfile,
        period: StatsPeriod = StatsPeriod.ALL,
        excludeCanceled: boolean = false,
    ): Promise<TicketStatsResponseDto> {
        const { dateFilter, startDate, limit, order } = this.getPeriodFilter(period);

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        // Get ticket stats for the tenant with date filter
        const filters = {
            where: {
                tenantId: accessProfile.tenantId,
                ...dateFilter,
            },
            ...(limit ? { take: limit } : {}),
            ...(order ? { order } : {}),
        };

        const [items] = await this.ticketStatsRepository.findAndCount(filters);

        // Filter by department if Supervisor
        let filteredItems = items;
        if (supervisorDepartmentId !== null) {
            filteredItems = items.filter(
                (stat) => stat.departmentIds && stat.departmentIds.includes(supervisorDepartmentId),
            );
        }

        // Optionally filter out canceled tickets
        if (excludeCanceled && filteredItems.length > 0) {
            const ticketIds = filteredItems.map((stat) => stat.ticketId);
            const tickets = await this.ticketRepository.find({
                where: { id: In(ticketIds) },
                relations: ['ticketStatus'],
                select: ['id', 'ticketStatus'],
            });

            const canceledTicketIds = new Set(
                tickets
                    .filter((ticket) => ticket.ticketStatus?.key === TicketStatus.Canceled)
                    .map((ticket) => ticket.id),
            );

            filteredItems = filteredItems.filter((stat) => !canceledTicketIds.has(stat.ticketId));
        }

        const itemsWithWeekendExclusion = await this.applyWeekendExclusion(filteredItems);
        const ticketStats = { items: itemsWithWeekendExclusion, total: filteredItems.length };

        const filteredTicketIds = ticketStats.items.map((stat) => stat.ticketId);

        // Calculate overall stats
        const totalTickets = ticketStats.items.length;
        const resolvedTickets = ticketStats.items.filter((stat) => stat.isResolved).length;
        const closedTickets = ticketStats.items.filter(
            (stat) => stat.resolutionTimeSeconds !== null,
        ).length;
        const openTickets = totalTickets - closedTickets;

        // Calculate resolution and acceptance rates
        const resolutionRate = closedTickets > 0 ? resolvedTickets / closedTickets : 0;

        let avgResolutionTimeSeconds = 0;
        let avgAcceptanceTimeSeconds = 0;

        // Only calculate time-based metrics when there are tickets in the selected period
        if (filteredTicketIds.length > 0) {
            // Calculate average resolution time using timeSecondsInLastStatus from ticket_update
            const resolutionQuery = this.ticketUpdateRepository
                .createQueryBuilder('update')
                .leftJoin('update.ticket', 'ticket')
                .leftJoin('update.fromUser', 'fromUser')
                .leftJoin('ticket.currentTargetUser', 'currentTargetUser')
                .where('update.fromStatus = :fromStatus', { fromStatus: TicketStatus.InProgress })
                .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
                .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                .andWhere('ticket.id IN (:...ticketIds)', { ticketIds: filteredTicketIds });

            if (startDate) {
                resolutionQuery.andWhere('update.createdAt >= :startDate', {
                    startDate,
                });
            }

            // Filter by department if Supervisor - check fromDepartmentId first, then fromUser, then currentTargetUser
            if (supervisorDepartmentId !== null) {
                resolutionQuery.andWhere(
                    `CASE
                        WHEN update.fromDepartmentId IS NOT NULL THEN update.fromDepartmentId = :departmentId
                        WHEN update.fromUserId IS NOT NULL THEN fromUser.departmentId = :departmentId
                        ELSE currentTargetUser.departmentId = :departmentId
                    END`,
                    { departmentId: supervisorDepartmentId },
                );
            }

            const resolutionUpdates = await resolutionQuery.getMany();
            const resolutionTimeSum = resolutionUpdates.reduce(
                (sum, update) => sum + (update.timeSecondsInLastStatus || 0),
                0,
            );

            const resolutionTicketIds = new Set(resolutionUpdates.map((update) => update.ticketId));
            avgResolutionTimeSeconds =
                resolutionTicketIds.size > 0 ? resolutionTimeSum / resolutionUpdates.length : 0;

            // Calculate average acceptance time using timeSecondsInLastStatus from ticket_update
            const acceptanceQuery = this.ticketUpdateRepository
                .createQueryBuilder('update')
                .leftJoin('update.ticket', 'ticket')
                .leftJoin('update.fromUser', 'fromUser')
                .leftJoin('ticket.currentTargetUser', 'currentTargetUser')
                .where('update.fromStatus = :fromStatus', { fromStatus: TicketStatus.Pending })
                .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
                .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                .andWhere('ticket.id IN (:...ticketIds)', { ticketIds: filteredTicketIds });

            if (startDate) {
                acceptanceQuery.andWhere('update.createdAt >= :startDate', {
                    startDate,
                });
            }

            // Filter by department if Supervisor - check fromDepartmentId first, then fromUser, then currentTargetUser
            if (supervisorDepartmentId !== null) {
                acceptanceQuery.andWhere(
                    `CASE
                        WHEN update.fromDepartmentId IS NOT NULL THEN update.fromDepartmentId = :departmentId
                        WHEN update.fromUserId IS NOT NULL THEN fromUser.departmentId = :departmentId
                        ELSE currentTargetUser.departmentId = :departmentId
                    END`,
                    { departmentId: supervisorDepartmentId },
                );
            }

            const acceptanceUpdates = await acceptanceQuery.getMany();
            const acceptanceTimeSum = acceptanceUpdates.reduce(
                (sum, update) => sum + (update.timeSecondsInLastStatus || 0),
                0,
            );

            const acceptanceTicketIds = new Set(acceptanceUpdates.map((update) => update.ticketId));
            avgAcceptanceTimeSeconds =
                acceptanceTicketIds.size > 0 ? acceptanceTimeSum / acceptanceUpdates.length : 0;
        }

        const avgTotalTimeSeconds = avgResolutionTimeSeconds + avgAcceptanceTimeSeconds;

        return {
            totalTickets,
            openTickets,
            closedTickets,
            resolvedTickets,
            averageResolutionTimeSeconds: avgResolutionTimeSeconds,
            averageAcceptanceTimeSeconds: avgAcceptanceTimeSeconds,
            averageTotalTimeSeconds: avgTotalTimeSeconds,
            resolutionRate: parseFloat(resolutionRate.toFixed(2)),
        };
    }

    async getDepartmentStats(
        accessProfile: AccessProfile,
        period: StatsPeriod = StatsPeriod.ALL,
        sortBy: string = 'efficiency',
    ): Promise<DepartmentStatsDto[]> {
        const { dateFilter, startDate } = this.getPeriodFilter(period);

        const filters = {
            where: {
                tenantId: accessProfile.tenantId,
                ...dateFilter,
            },
        };

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const [items] = await this.ticketStatsRepository.findAndCount(filters);

        // Filter by department if Supervisor
        let filteredItems = items;
        if (supervisorDepartmentId !== null) {
            filteredItems = items.filter(
                (stat) => stat.departmentIds && stat.departmentIds.includes(supervisorDepartmentId),
            );
        }

        // Filter out canceled tickets and only include finished tasks (Completed or Rejected)
        const completedTicketsMap: Map<number, { completedAt: Date | null; dueAt: Date | null }> =
            new Map();
        if (filteredItems.length > 0) {
            const ticketIds = filteredItems.map((stat) => stat.ticketId);
            const tickets = await this.ticketRepository.find({
                where: { id: In(ticketIds) },
                relations: ['ticketStatus'],
                select: ['id', 'ticketStatus', 'completedAt', 'dueAt'],
            });

            // Only include tickets that are Completed or Rejected (finished tasks)
            // Exclude Cancelled ones
            const finishedTicketIds = new Set(
                tickets
                    .filter(
                        (ticket) =>
                            ticket.ticketStatus?.key === TicketStatus.Completed ||
                            ticket.ticketStatus?.key === TicketStatus.Rejected,
                    )
                    .map((ticket) => ticket.id),
            );

            // Store completed tickets with their dates for overdue calculation
            // NEW LOGIC: We need to check the FIRST time the ticket went to 'aguardando_verificação'
            // If that time > dueAt, then it is overdue.
            // We still keep completedTicketsMap structure but we will enrich it or fetch updates separately.
            
            // Let's fetch the first 'aguardando_verificação' update for these tickets
            const firstVerificationUpdates = await this.ticketUpdateRepository
                .createQueryBuilder('update')
                .select('update.ticketId', 'ticketId')
                .addSelect('MIN(update.createdAt)', 'firstVerificationAt')
                .where('update.ticketId IN (:...ticketIds)', { ticketIds: Array.from(finishedTicketIds) })
                .andWhere('update.toStatus = :status', { status: TicketStatus.AwaitingVerification })
                .groupBy('update.ticketId')
                .getRawMany();
            
            const verificationMap = new Map<number, Date>();
            firstVerificationUpdates.forEach((update) => {
                verificationMap.set(update.ticketId, new Date(update.firstVerificationAt));
            });

            tickets
                .filter((ticket) => finishedTicketIds.has(ticket.id))
                .forEach((ticket) => {
                    completedTicketsMap.set(ticket.id, {
                        completedAt: ticket.completedAt,
                        dueAt: ticket.dueAt,
                        firstVerificationAt: verificationMap.get(ticket.id) || null,
                    } as any);
                });

            filteredItems = filteredItems.filter((stat) => finishedTicketIds.has(stat.ticketId));
        }

        // Apply weekend exclusion to time calculations
        const itemsWithWeekendExclusion = await this.applyWeekendExclusion(filteredItems);
        const ticketStats = { items: itemsWithWeekendExclusion, total: filteredItems.length };

        // If Supervisor, only return stats for their department
        const departments = await this.departmentService.findMany(accessProfile, {
            paginated: false,
        });

        const departmentsToProcess =
            supervisorDepartmentId !== null
                ? departments.items.filter((dept) => dept.id === supervisorDepartmentId)
                : departments.items;

        // Create a map to track which departments have completed tickets with dueAt
        const departmentsWithCompletedTicketsWithDueAt = new Set<number>();
        for (const [ticketId, ticketInfo] of completedTicketsMap.entries()) {
            if (ticketInfo.completedAt && ticketInfo.dueAt) {
                // Find which department(s) this ticket belongs to
                const ticketStat = filteredItems.find((stat) => stat.ticketId === ticketId);
                if (ticketStat && ticketStat.departmentIds) {
                    ticketStat.departmentIds.forEach((deptId) => {
                        departmentsWithCompletedTicketsWithDueAt.add(deptId);
                    });
                }
            }
        }

        return Promise.all(
            departmentsToProcess.map(async (department) => {
                const departmentTickets = ticketStats.items.filter(
                    (stat) => stat.departmentIds && stat.departmentIds.includes(department.id),
                );
                const totalDeptTickets = departmentTickets.length;
                const resolvedDeptTickets = departmentTickets.filter(
                    (stat) => stat.isResolved,
                ).length;

                // Count active users in this department
                const userCount = await this.userRepository.count({
                    where: {
                        tenantId: accessProfile.tenantId,
                        departmentId: department.id,
                        isActive: true,
                    },
                });

                // Calculate average resolution time using timeSecondsInLastStatus from ticket_update
                // Filter directly by fromUserId's department instead of getting all department tickets first
                let avgDeptResolutionTimeSeconds = 0;
                const resolutionQuery = this.ticketUpdateRepository
                    .createQueryBuilder('update')
                    .leftJoin('update.fromUser', 'fromUser')
                    .leftJoin('update.ticket', 'ticket')
                    .leftJoin('ticket.currentTargetUser', 'currentTargetUser')
                    .where('update.fromStatus = :fromStatus', {
                        fromStatus: TicketStatus.InProgress,
                    })
                    .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
                    .andWhere('update.tenantId = :tenantId', {
                        tenantId: accessProfile.tenantId,
                    })
                    .andWhere(
                        `CASE
                            WHEN update.fromDepartmentId IS NOT NULL THEN update.fromDepartmentId = :departmentId
                            WHEN update.fromUserId IS NOT NULL THEN fromUser.departmentId = :departmentId
                            ELSE currentTargetUser.departmentId = :departmentId
                        END`,
                        { departmentId: department.id },
                    );

                if (startDate) {
                    resolutionQuery.andWhere('update.createdAt >= :startDate', {
                        startDate,
                    });
                }

                const resolutionUpdates = await resolutionQuery.getMany();

                if (resolutionUpdates.length > 0) {
                    const resolutionTimeSum = resolutionUpdates.reduce(
                        (sum, update) => sum + (update.timeSecondsInLastStatus || 0),
                        0,
                    );

                    const resolutionTicketIds = new Set(
                        resolutionUpdates.map((update) => update.ticketId),
                    );
                    avgDeptResolutionTimeSeconds =
                        resolutionTicketIds.size > 0
                            ? resolutionTimeSum / resolutionTicketIds.size
                            : 0;
                }

                // Calculate average acceptance time using timeSecondsInLastStatus from ticket_update
                // Filter directly by fromUserId's department instead of getting all department tickets first
                let avgDeptAcceptanceTimeSeconds = 0;
                const acceptanceQuery = this.ticketUpdateRepository
                    .createQueryBuilder('update')
                    .leftJoin('update.fromUser', 'fromUser')
                    .leftJoin('update.ticket', 'ticket')
                    .leftJoin('ticket.currentTargetUser', 'currentTargetUser')
                    .where('update.fromStatus = :fromStatus', {
                        fromStatus: TicketStatus.Pending,
                    })
                    .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
                    .andWhere('update.tenantId = :tenantId', {
                        tenantId: accessProfile.tenantId,
                    })
                    .andWhere(
                        `CASE
                            WHEN update.fromDepartmentId IS NOT NULL THEN update.fromDepartmentId = :departmentId
                            WHEN update.fromUserId IS NOT NULL THEN fromUser.departmentId = :departmentId
                            ELSE currentTargetUser.departmentId = :departmentId
                        END`,
                        { departmentId: department.id },
                    );

                if (startDate) {
                    acceptanceQuery.andWhere('update.createdAt >= :startDate', {
                        startDate,
                    });
                }

                const acceptanceUpdates = await acceptanceQuery.getMany();
                if (acceptanceUpdates.length > 0) {
                    const acceptanceTimeSum = acceptanceUpdates.reduce(
                        (sum, update) => sum + (update.timeSecondsInLastStatus || 0),
                        0,
                    );

                    const acceptanceTicketIds = new Set(
                        acceptanceUpdates.map((update) => update.ticketId),
                    );
                    avgDeptAcceptanceTimeSeconds =
                        acceptanceTicketIds.size > 0
                            ? acceptanceTimeSum / acceptanceTicketIds.size
                            : 0;
                }

                const avgDeptTotalTimeSeconds =
                    avgDeptAcceptanceTimeSeconds + avgDeptResolutionTimeSeconds;

                const deptResolutionRate =
                    totalDeptTickets > 0 ? resolvedDeptTickets / totalDeptTickets : 0;

                const efficiencyScore = this.calculateWilsonScore(
                    resolvedDeptTickets,
                    totalDeptTickets,
                );

                // Calculate overdue rate for this department
                let overdueRate = 0;
                const departmentCompletedTickets = departmentTickets.filter((stat) => {
                    const ticketInfo: any = completedTicketsMap.get(stat.ticketId);

                    return ticketInfo && ticketInfo.dueAt && ticketInfo.firstVerificationAt;
                });

                if (departmentCompletedTickets.length > 0) {
                    const overdueCount = departmentCompletedTickets.filter((stat) => {
                        const ticketInfo: any = completedTicketsMap.get(stat.ticketId);
                        return (
                            ticketInfo &&
                            ticketInfo.firstVerificationAt &&
                            ticketInfo.dueAt &&
                            ticketInfo.firstVerificationAt > ticketInfo.dueAt
                        );
                    }).length;
                    overdueRate = parseFloat(
                        ((overdueCount / departmentCompletedTickets.length) * 100).toFixed(2),
                    );
                }

                return {
                    departmentId: department.id,
                    departmentName: department.name,
                    totalTickets: totalDeptTickets,
                    resolvedTickets: resolvedDeptTickets,
                    averageResolutionTimeSeconds: avgDeptResolutionTimeSeconds,
                    averageAcceptanceTimeSeconds: avgDeptAcceptanceTimeSeconds,
                    averageTotalTimeSeconds: avgDeptTotalTimeSeconds,
                    resolutionRate: parseFloat(deptResolutionRate.toFixed(2)),
                    efficiencyScore,
                    overdueRate,
                    userCount,
                };
            }),
        ).then((departmentStats) => {
            // Filter departments based on sortBy parameter
            const filteredStats = departmentStats.filter((dept) => {
                // When sorting by resolution time, exclude departments with 0 seconds
                if (sortBy === 'resolution_time') {
                    return dept.averageResolutionTimeSeconds > 0;
                }
                // When sorting by overdue rate, exclude departments with no completed tickets with dueAt
                if (sortBy === 'overdue_rate') {
                    return departmentsWithCompletedTicketsWithDueAt.has(dept.departmentId);
                }
                return true;
            });

            // Sort departments based on sortBy parameter
            return filteredStats.sort((a, b) => {
                if (sortBy === 'resolution_time') {
                    // Sort by resolution time (lower is better)
                    return a.averageResolutionTimeSeconds - b.averageResolutionTimeSeconds;
                } else if (sortBy === 'overdue_rate') {
                    // Sort by overdue rate (lower is better - fewer overdue tickets)
                    return a.overdueRate - b.overdueRate;
                } else {
                    // Default: sort by efficiency score (higher is better)
                    return b.efficiencyScore - a.efficiencyScore;
                }
            });
        });
    }

    async getTicketTrends(accessProfile: AccessProfile): Promise<TicketTrendsResponseDto> {
        const today = new Date();

        // Run all trend calculations in parallel
        const [daily, weekly, monthly, trimestral] = await Promise.all([
            this.calculateDailyTrends(accessProfile, today, 30),
            this.calculateWeeklyTrends(accessProfile, today, 8), // 2 months = 8 weeks
            this.calculateMonthlyTrends(accessProfile, today, 6),
            this.calculateTrimestralTrends(accessProfile, today, 9), // 9 intervals of 10 days = ~3 months
        ]);

        return {
            daily,
            weekly,
            monthly,
            trimestral,
        };
    }

    async getPerformanceTrends(
        accessProfile: AccessProfile,
        period: StatsPeriod = StatsPeriod.TRIMESTRAL,
    ): Promise<PerformanceTrendsResponseDto> {
        const { startDate } = this.getPeriodFilter(period);

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        // Build query for created tickets
        const createdQuery = this.ticketRepository.createQueryBuilder('ticket');
        createdQuery
            .leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus')
            .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });

        if (startDate) {
            createdQuery.andWhere('ticket.createdAt >= :startDate', { startDate });
        }

        // Filter by department if Supervisor
        if (supervisorDepartmentId !== null) {
            createdQuery.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const createdTickets = await createdQuery.getMany();
        const totalCreated = createdTickets.length;

        // Build query for resolved tickets (completed in the period)
        const resolvedQuery = this.ticketRepository.createQueryBuilder('ticket');
        resolvedQuery
            .leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus')
            .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere('ticket.completedAt IS NOT NULL')
            .andWhere('ticketStatus.key = :status', { status: TicketStatus.Completed });

        if (startDate) {
            resolvedQuery.andWhere('ticket.completedAt >= :startDate', { startDate });
        }

        // Filter by department if Supervisor
        if (supervisorDepartmentId !== null) {
            resolvedQuery.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const resolvedTickets = await resolvedQuery.getMany();
        const totalResolved = resolvedTickets.length;

        return {
            totalCreated,
            totalResolved,
        };
    }

    private async calculateDailyTrends(
        accessProfile: AccessProfile,
        endDate: Date,
        days: number,
    ): Promise<TrendDataPointDto[]> {
        // Prepare date ranges for all days at once
        const dateRanges = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = startOfDay(subDays(endDate, i));
            dateRanges.push({
                date,
                startOfPeriod: date,
                endOfPeriod: endOfDay(date),
            });
        }

        // Get tickets for the tenant from the last 30 days only
        const startOfRange = startOfDay(subDays(endDate, days - 1));

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const qb = this.ticketRepository.createQueryBuilder('ticket');
        qb.leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus');
        qb.where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        qb.andWhere('ticket.createdAt >= :startOfRange', { startOfRange });
        qb.select(['ticket.id', 'ticket.createdAt', 'ticket.completedAt', 'ticketStatus.key']);

        // Filter by department if Supervisor using EXISTS subquery
        if (supervisorDepartmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const tickets = await qb.getMany();

        return dateRanges.map(({ date, startOfPeriod, endOfPeriod }) => {
            const total = tickets.filter((ticket) => ticket.createdAt <= endOfPeriod).length;

            const created = tickets.filter(
                (ticket) => ticket.createdAt >= startOfPeriod && ticket.createdAt <= endOfPeriod,
            ).length;

            const resolved = tickets.filter(
                (ticket) =>
                    ticket.completedAt &&
                    ticket.completedAt >= startOfPeriod &&
                    ticket.completedAt <= endOfPeriod &&
                    ticket.ticketStatus?.key === TicketStatus.Completed,
            ).length;

            return {
                date: date.toISOString(),
                total,
                resolved,
                created,
            };
        });
    }

    private async calculateWeeklyTrends(
        accessProfile: AccessProfile,
        endDate: Date,
        weeks: number,
    ): Promise<TrendDataPointDto[]> {
        const dateRanges = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const startDate = startOfWeek(subWeeks(endDate, i));
            dateRanges.push({
                date: startDate,
                startOfPeriod: startDate,
                endOfPeriod: endOfWeek(startDate),
            });
        }

        const startOfRange = startOfWeek(subWeeks(endDate, weeks - 1));

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const qb = this.ticketRepository.createQueryBuilder('ticket');
        qb.leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus');
        qb.where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        qb.andWhere('ticket.createdAt >= :startOfRange', { startOfRange });
        qb.select(['ticket.id', 'ticket.createdAt', 'ticket.completedAt', 'ticketStatus.key']);

        // Filter by department if Supervisor using EXISTS subquery
        if (supervisorDepartmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const tickets = await qb.getMany();

        return dateRanges.map(({ date, startOfPeriod, endOfPeriod }) => {
            const total = tickets.filter((ticket) => ticket.createdAt <= endOfPeriod).length;

            // Tickets created during this week
            const created = tickets.filter(
                (ticket) => ticket.createdAt >= startOfPeriod && ticket.createdAt <= endOfPeriod,
            ).length;

            // Tickets resolved during this week
            const resolved = tickets.filter(
                (ticket) =>
                    ticket.completedAt &&
                    ticket.completedAt >= startOfPeriod &&
                    ticket.completedAt <= endOfPeriod &&
                    ticket.ticketStatus?.key === TicketStatus.Completed,
            ).length;

            return {
                date: date.toISOString(),
                total,
                resolved,
                created,
            };
        });
    }

    private async calculateMonthlyTrends(
        accessProfile: AccessProfile,
        endDate: Date,
        months: number,
    ): Promise<TrendDataPointDto[]> {
        const dateRanges = [];
        for (let i = months - 1; i >= 0; i--) {
            const startDate = startOfMonth(subMonths(endDate, i));
            dateRanges.push({
                date: startDate,
                startOfPeriod: startDate,
                endOfPeriod: endOfMonth(startDate),
            });
        }

        const startOfRange = startOfMonth(subMonths(endDate, months - 1));

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const qb = this.ticketRepository.createQueryBuilder('ticket');
        qb.leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus');
        qb.where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        qb.andWhere('ticket.createdAt >= :startOfRange', { startOfRange });
        qb.select(['ticket.id', 'ticket.createdAt', 'ticket.completedAt', 'ticketStatus.key']);

        // Filter by department if Supervisor using EXISTS subquery
        if (supervisorDepartmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const tickets = await qb.getMany();

        return dateRanges.map(({ date, startOfPeriod, endOfPeriod }) => {
            const total = tickets.filter((ticket) => ticket.createdAt <= endOfPeriod).length;

            const created = tickets.filter(
                (ticket) => ticket.createdAt >= startOfPeriod && ticket.createdAt <= endOfPeriod,
            ).length;

            const resolved = tickets.filter(
                (ticket) =>
                    ticket.completedAt &&
                    ticket.completedAt >= startOfPeriod &&
                    ticket.completedAt <= endOfPeriod &&
                    ticket.ticketStatus?.key === TicketStatus.Completed,
            ).length;

            return {
                date: date.toISOString(),
                total,
                resolved,
                created,
            };
        });
    }

    private async calculateTrimestralTrends(
        accessProfile: AccessProfile,
        endDate: Date,
        intervals: number,
    ): Promise<TrendDataPointDto[]> {
        const dateRanges = [];
        // Each interval is 10 days
        const intervalDays = 10;

        for (let i = intervals - 1; i >= 0; i--) {
            const date = startOfDay(subDays(endDate, i * intervalDays));
            dateRanges.push({
                date,
                startOfPeriod: date,
                endOfPeriod: endOfDay(date),
            });
        }

        // Get tickets for the tenant from the last 3 months
        const startOfRange = startOfDay(subDays(endDate, (intervals - 1) * intervalDays));

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const qb = this.ticketRepository.createQueryBuilder('ticket');
        qb.leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus');
        qb.where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        qb.andWhere('ticket.createdAt >= :startOfRange', { startOfRange });
        qb.select(['ticket.id', 'ticket.createdAt', 'ticket.completedAt', 'ticketStatus.key']);

        // Filter by department if Supervisor using EXISTS subquery
        if (supervisorDepartmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const tickets = await qb.getMany();

        return dateRanges.map(({ date, startOfPeriod, endOfPeriod }) => {
            const total = tickets.filter((ticket) => ticket.createdAt <= endOfPeriod).length;

            const created = tickets.filter(
                (ticket) => ticket.createdAt >= startOfPeriod && ticket.createdAt <= endOfPeriod,
            ).length;

            const resolved = tickets.filter(
                (ticket) =>
                    ticket.completedAt &&
                    ticket.completedAt >= startOfPeriod &&
                    ticket.completedAt <= endOfPeriod &&
                    ticket.ticketStatus?.key === TicketStatus.Completed,
            ).length;

            return {
                date: date.toISOString(),
                total,
                resolved,
                created,
            };
        });
    }

    private calculateAverage(values: (number | string | null | undefined)[]): number {
        const validValues = values
            .filter((val) => val !== null && val !== undefined && val !== 0)
            .map((val) => (typeof val === 'string' ? parseFloat(val) : val));

        if (validValues.length === 0) return 0;

        const sum = validValues.reduce((acc, val) => acc + (val as number), 0);
        return sum / validValues.length;
    }

    async getTicketsByStatus(
        accessProfile: AccessProfile,
        period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<TicketStatusCountResponseDto> {
        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const { startDate } = this.getPeriodFilter(period);

        const qb = this.ticketRepository.createQueryBuilder('ticket');
        qb.leftJoinAndSelect('ticket.ticketStatus', 'ticketStatus');
        qb.where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });

        if (startDate) {
            qb.andWhere('ticket.createdAt >= :startDate', { startDate });
        }

        qb.select(['ticket.id', 'ticketStatus.key']);

        // Filter by department if Supervisor using EXISTS subquery
        if (supervisorDepartmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const tickets = await qb.getMany();

        const total = tickets.length;
        const statusMap = new Map<string, number>();

        Object.values(TicketStatus).forEach((status) => {
            statusMap.set(status, 0);
        });

        tickets.forEach((ticket) => {
            const statusKey = ticket.ticketStatus?.key || '';
            const currentCount = statusMap.get(statusKey) || 0;
            statusMap.set(statusKey, currentCount + 1);
        });

        const statusCounts: TicketStatusCountDto[] = Array.from(statusMap.entries()).map(
            ([status, count]) => ({
                status: status as TicketStatus,
                count,
            }),
        );

        return {
            statusCounts,
            total,
        };
    }

    async getTicketsByPriority(
        accessProfile: AccessProfile,
        period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<TicketPriorityCountResponseDto> {
        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const { startDate } = this.getPeriodFilter(period);

        const qb = this.ticketRepository.createQueryBuilder('ticket');
        qb.where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });

        // Apply period filter
        if (startDate) {
            qb.andWhere('ticket.createdAt >= :startDate', { startDate });
        }

        qb.select(['ticket.id', 'ticket.priority']);

        // Filter by department if Supervisor using EXISTS subquery
        if (supervisorDepartmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const tickets = await qb.getMany();

        const total = tickets.length;
        const priorityMap = new Map<string, number>();

        Object.values(TicketPriority).forEach((priority) => {
            priorityMap.set(priority, 0);
        });

        tickets.forEach((ticket) => {
            const currentCount = priorityMap.get(ticket.priority) || 0;
            priorityMap.set(ticket.priority, currentCount + 1);
        });

        const priorityCounts: TicketPriorityCountDto[] = Array.from(priorityMap.entries()).map(
            ([priority, count]) => ({
                priority: priority as TicketPriority,
                count,
            }),
        );

        return {
            priorityCounts,
            total,
        };
    }

    async getUserStats(
        accessProfile: AccessProfile,
        userId: number,
        period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<TicketStatsResponseDto> {
        const { startDate, limit, order } = this.getPeriodFilter(period);

        // Find all ticket IDs where the user is involved (either as currentTargetUserId or in targetUsers)
        const ticketIdsQuery = this.ticketRepository
            .createQueryBuilder('ticket')
            .select('ticket.id', 'id')
            .where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere(
                `(
                    ticket.currentTargetUserId = :userId
                    OR EXISTS (
                        SELECT 1
                        FROM ticket_target_user ttu
                        WHERE ttu."ticketId" = ticket.id
                        AND ttu."userId" = :userId
                        AND ttu."tenantId" = :tenantId
                    )
                )`,
                { userId, tenantId: accessProfile.tenantId },
            );

        if (startDate) {
            ticketIdsQuery.andWhere('ticket.createdAt >= :startDate', { startDate });
        }

        const ticketIdsResult = await ticketIdsQuery.getRawMany();
        const ticketIds = ticketIdsResult.map((row) => row.id).filter(Boolean);

        if (ticketIds.length === 0) {
            // No tickets found, return empty stats
            return {
                totalTickets: 0,
                openTickets: 0,
                closedTickets: 0,
                resolvedTickets: 0,
                averageResolutionTimeSeconds: 0,
                averageAcceptanceTimeSeconds: 0,
                averageTotalTimeSeconds: 0,
                resolutionRate: 0,
            };
        }

        // Query the TicketStats view for these ticket IDs
        const qb = this.ticketStatsRepository.createQueryBuilder('ticketStats');
        qb.where('ticketStats.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        qb.andWhere('ticketStats.ticketId IN (:...ticketIds)', { ticketIds });

        // Apply order if provided
        if (order) {
            Object.entries(order).forEach(([field, direction]) => {
                qb.addOrderBy(`ticketStats.${field}`, direction === 'ASC' ? 'ASC' : 'DESC');
            });
        } else {
            qb.addOrderBy('ticketStats.createdAt', 'DESC');
        }

        // Apply limit if provided
        if (limit) {
            qb.take(limit);
        }

        const [items, total] = await qb.getManyAndCount();

        const itemsWithWeekendExclusion = await this.applyWeekendExclusion(items);
        const ticketStats = { items: itemsWithWeekendExclusion, total };

        const totalTickets = ticketStats.items.length;
        const resolvedTickets = ticketStats.items.filter((stat) => stat.isResolved).length;
        const closedTickets = ticketStats.items.filter(
            (stat) => stat.resolutionTimeSeconds !== null,
        ).length;
        const openTickets = totalTickets - closedTickets;

        const resolutionRate = closedTickets > 0 ? resolvedTickets / closedTickets : 0;

        const resolutionQuery = this.ticketUpdateRepository
            .createQueryBuilder('update')
            .leftJoin('update.ticket', 'ticket')
            .where('update.fromStatus = :fromStatus', { fromStatus: TicketStatus.InProgress })
            .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
            .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere(
                '(update.fromUserId = :userId OR (update.fromUserId IS NULL AND ticket.currentTargetUserId = :userId))',
                { userId },
            );

        if (startDate) {
            resolutionQuery.andWhere('update.createdAt >= :startDate', {
                startDate,
            });
        }

        const resolutionUpdates = await resolutionQuery.getMany();
        const resolutionTimeSum = resolutionUpdates.reduce(
            (sum, update) => sum + (update.timeSecondsInLastStatus || 0),
            0,
        );

        const resolutionTicketIds = new Set(resolutionUpdates.map((update) => update.ticketId));
        const avgResolutionTimeSeconds =
            resolutionTicketIds.size > 0 ? resolutionTimeSum / resolutionTicketIds.size : 0;

        const acceptanceQuery = this.ticketUpdateRepository
            .createQueryBuilder('update')
            .leftJoin('update.ticket', 'ticket')
            .where('update.fromStatus = :fromStatus', { fromStatus: TicketStatus.Pending })
            .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
            .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere(
                '(update.fromUserId = :userId OR (update.fromUserId IS NULL AND ticket.currentTargetUserId = :userId))',
                { userId },
            );

        if (startDate) {
            acceptanceQuery.andWhere('update.createdAt >= :startDate', {
                startDate,
            });
        }

        const acceptanceUpdates = await acceptanceQuery.getMany();
        const acceptanceTimeSum = acceptanceUpdates.reduce(
            (sum, update) => sum + (update.timeSecondsInLastStatus || 0),
            0,
        );
        const avgAcceptanceTimeSeconds =
            acceptanceUpdates.length > 0 ? acceptanceTimeSum / acceptanceUpdates.length : 0;

        const avgTotalTimeSeconds = avgResolutionTimeSeconds + avgAcceptanceTimeSeconds;

        return {
            totalTickets,
            openTickets,
            closedTickets,
            resolvedTickets,
            averageResolutionTimeSeconds: avgResolutionTimeSeconds,
            averageAcceptanceTimeSeconds: avgAcceptanceTimeSeconds,
            averageTotalTimeSeconds: avgTotalTimeSeconds,
            resolutionRate: parseFloat(resolutionRate.toFixed(2)),
        };
    }

    async getStatusDurations(
        accessProfile: AccessProfile,
        period: StatsPeriod = StatsPeriod.ALL,
    ): Promise<StatusDurationResponseDto> {
        const { startDate } = this.getPeriodFilter(period);

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const qb = this.ticketUpdateRepository.createQueryBuilder('update');
        qb.innerJoin('update.ticket', 'ticket');
        qb.where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        qb.andWhere('update.timeSecondsInLastStatus IS NOT NULL');

        // Filter by department if Supervisor using EXISTS subquery
        if (supervisorDepartmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        if (startDate) {
            qb.andWhere('update.createdAt >= :startDate', { startDate });
        }

        const ticketUpdates = await qb.getMany();

        const statusDurationsMap = new Map<string, { total: number; count: number }>();

        Object.values(TicketStatus).forEach((status) => {
            statusDurationsMap.set(status, { total: 0, count: 0 });
        });

        // Apply weekend exclusion to each update
        const updatesWithWeekendExclusion = await Promise.all(
            ticketUpdates.map(async (update) => {
                if (update.fromStatus && update.timeSecondsInLastStatus) {
                    // Find the previous status update where the ticket entered the fromStatus
                    // Must be BEFORE the current update to avoid negative durations
                    const previousStatusUpdate = await this.ticketUpdateRepository.findOne({
                        where: {
                            ticketId: update.ticketId,
                            toStatus: update.fromStatus,
                            createdAt: LessThan(update.createdAt),
                        },
                        order: {
                            createdAt: 'DESC',
                        },
                    });

                    if (previousStatusUpdate) {
                        // Filter by period: only include if ticket entered the status within the period
                        if (startDate && previousStatusUpdate.createdAt < startDate) {
                            return null; // Skip this update as it started before the period
                        }

                        const businessHours = this.businessHoursService.calculateBusinessHours(
                            previousStatusUpdate.createdAt,
                            update.createdAt,
                        );

                        // Only update if business hours is non-negative
                        if (businessHours >= 0) {
                            return {
                                ...update,
                                timeSecondsInLastStatus: businessHours * 3600,
                            };
                        }
                    }
                }
                return null; // Return null for updates that don't meet criteria
            }),
        );

        // Filter out null values and process valid updates
        updatesWithWeekendExclusion
            .filter((update): update is NonNullable<typeof update> => update !== null)
            .forEach((update) => {
                if (update.fromStatus && update.timeSecondsInLastStatus) {
                    const statusData = statusDurationsMap.get(update.fromStatus) || {
                        total: 0,
                        count: 0,
                    };
                    statusData.total += update.timeSecondsInLastStatus;
                    statusData.count += 1;
                    statusDurationsMap.set(update.fromStatus, statusData);
                }
            });

        const statusDurations: StatusDurationDto[] = Array.from(statusDurationsMap.entries()).map(
            ([status, data]) => ({
                status: status as TicketStatus,
                totalDurationSeconds: data.total,
                count: data.count,
                averageDurationSeconds: data.count > 0 ? Math.round(data.total / data.count) : 0,
            }),
        );

        return {
            statusDurations,
        };
    }

    async getResolutionTimeData(accessProfile: AccessProfile): Promise<ResolutionTimeResponseDto> {
        const now = new Date();

        const [weeklyData, monthlyData, quarterlyData] = await Promise.all([
            this.getWeeklyResolutionTime(accessProfile, now),
            this.getMonthlyResolutionTime(accessProfile, now),
            this.getQuarterlyResolutionTime(accessProfile, now),
        ]);

        const weekAverage = this.calculateAverage(weeklyData.map((item) => item.value));
        const monthAverage = this.calculateAverage(monthlyData.map((item) => item.value));
        const quarterAverage = this.calculateAverage(quarterlyData.map((item) => item.value));

        return {
            data: {
                week: weeklyData,
                month: monthlyData,
                quarter: quarterlyData,
            },
            average: {
                week: weekAverage,
                month: monthAverage,
                quarter: quarterAverage,
            },
        };
    }

    private async getWeeklyResolutionTime(accessProfile: AccessProfile, endDate: Date) {
        const weeks = 6;
        const weekData = [];

        for (let i = weeks - 1; i >= 0; i--) {
            const startDate = startOfWeek(subWeeks(endDate, i));
            const endDateOfWeek = endOfWeek(startDate);

            const label = `${startDate.getDate().toString().padStart(2, '0')}/${(startDate.getMonth() + 1).toString().padStart(2, '0')} - ${endDateOfWeek.getDate().toString().padStart(2, '0')}/${(endDateOfWeek.getMonth() + 1).toString().padStart(2, '0')}`;

            const averageResolutionTime = await this.getAverageResolutionTimeForPeriod(
                accessProfile,
                startDate,
                endDateOfWeek,
            );

            weekData.push({
                label,
                value: averageResolutionTime,
            });
        }

        return weekData;
    }

    private async getMonthlyResolutionTime(accessProfile: AccessProfile, endDate: Date) {
        const months = 6;
        const monthData = [];

        const ptMonthNames = [
            'Jan',
            'Fev',
            'Mar',
            'Abr',
            'Mai',
            'Jun',
            'Jul',
            'Ago',
            'Set',
            'Out',
            'Nov',
            'Dez',
        ];

        for (let i = months - 1; i >= 0; i--) {
            const startDate = startOfMonth(subMonths(endDate, i));
            const endDateOfMonth = endOfMonth(startDate);

            const monthIndex = startDate.getMonth();
            const label = `${ptMonthNames[monthIndex]}/${startDate.getFullYear().toString().substr(2)}`;

            const averageResolutionTime = await this.getAverageResolutionTimeForPeriod(
                accessProfile,
                startDate,
                endDateOfMonth,
            );

            monthData.push({
                label,
                value: averageResolutionTime,
            });
        }

        return monthData;
    }

    private async getQuarterlyResolutionTime(accessProfile: AccessProfile, endDate: Date) {
        const quarters = 4;
        const quarterData = [];

        for (let i = quarters - 1; i >= 0; i--) {
            const startDate = startOfQuarter(subQuarters(endDate, i));
            const endDateOfQuarter = endOfQuarter(startDate);

            const quarter = getQuarter(startDate);
            const year = startDate.getFullYear();
            const label = `T${quarter}/${year.toString().substr(2)}`;

            const averageResolutionTime = await this.getAverageResolutionTimeForPeriod(
                accessProfile,
                startDate,
                endDateOfQuarter,
            );

            quarterData.push({
                label,
                value: averageResolutionTime,
            });
        }

        return quarterData;
    }

    private async getAverageResolutionTimeForPeriod(
        accessProfile: AccessProfile,
        startDate: Date,
        endDate: Date,
    ): Promise<number> {
        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        // Use timeSecondsInLastStatus from ticket_update where fromStatus = 'em_andamento'
        const resolutionQuery = this.ticketUpdateRepository
            .createQueryBuilder('update')
            .leftJoin('update.ticket', 'ticket')
            .where('update.fromStatus = :fromStatus', { fromStatus: TicketStatus.InProgress })
            .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
            .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere('update.createdAt >= :startDate', { startDate })
            .andWhere('update.createdAt <= :endDate', { endDate });

        // Filter by department if Supervisor - check fromDepartmentId first, then fromUser, then currentTargetUser
        if (supervisorDepartmentId !== null) {
            resolutionQuery
                .leftJoin('update.fromUser', 'fromUser')
                .leftJoin('ticket.currentTargetUser', 'currentTargetUser')
                .andWhere(
                    `CASE
                        WHEN update.fromDepartmentId IS NOT NULL THEN update.fromDepartmentId = :departmentId
                        WHEN update.fromUserId IS NOT NULL THEN fromUser.departmentId = :departmentId
                        ELSE currentTargetUser.departmentId = :departmentId
                    END`,
                    { departmentId: supervisorDepartmentId },
                );
        }

        const resolutionUpdates = await resolutionQuery.getMany();

        if (resolutionUpdates.length === 0) {
            return 0;
        }

        const resolutionTimeSum = resolutionUpdates.reduce(
            (sum, update) => sum + (update.timeSecondsInLastStatus || 0),
            0,
        );

        const avgResolutionTimeSeconds =
            resolutionUpdates.length > 0 ? resolutionTimeSum / resolutionUpdates.length : 0;

        // Convert seconds to hours
        const avgResolutionTimeHours = avgResolutionTimeSeconds / 3600;

        return Math.round(avgResolutionTimeHours * 10) / 10;
    }

    async getStatusDurationTimeSeries(
        accessProfile: AccessProfile,
        status: TicketStatus,
        period: 'week' | 'month' | 'quarter' = 'month',
    ): Promise<StatusDurationTimeSeriesResponseDto> {
        const now = new Date();
        let timeSeriesData: StatusDurationTimePointDto[] = [];

        if (period === 'week') {
            timeSeriesData = await this.getWeeklyStatusDuration(accessProfile, status, now);
        } else if (period === 'month') {
            timeSeriesData = await this.getMonthlyStatusDuration(accessProfile, status, now);
        } else if (period === 'quarter') {
            timeSeriesData = await this.getQuarterlyStatusDuration(accessProfile, status, now);
        }

        // Calculate the overall average in seconds
        const totalDurationSecondsOverall = timeSeriesData.reduce(
            (sum, item) => sum + item.value * item.count,
            0,
        );
        const totalCount = timeSeriesData.reduce((sum, item) => sum + item.count, 0);
        const averageDuration = totalCount > 0 ? totalDurationSecondsOverall / totalCount : 0;

        return {
            status,
            data: timeSeriesData,
            averageDuration: Math.round(averageDuration), // Round to whole seconds
        };
    }

    private async getWeeklyStatusDuration(
        accessProfile: AccessProfile,
        status: TicketStatus,
        endDate: Date,
    ): Promise<StatusDurationTimePointDto[]> {
        const weeks = 6;
        const weekData: StatusDurationTimePointDto[] = [];

        for (let i = weeks - 1; i >= 0; i--) {
            const startDate = startOfWeek(subWeeks(endDate, i));
            const endDateOfWeek = endOfWeek(startDate);

            const label = `${startDate.getDate().toString().padStart(2, '0')}/${(startDate.getMonth() + 1).toString().padStart(2, '0')} - ${endDateOfWeek.getDate().toString().padStart(2, '0')}/${(endDateOfWeek.getMonth() + 1).toString().padStart(2, '0')}`;

            const { averageDurationSeconds, count } = await this.getAverageStatusDurationForPeriod(
                accessProfile,
                status,
                startDate,
                endDateOfWeek,
            );

            weekData.push({
                month: label,
                value: Math.round(averageDurationSeconds),
                count,
            });
        }

        return weekData;
    }

    private async getMonthlyStatusDuration(
        accessProfile: AccessProfile,
        status: TicketStatus,
        endDate: Date,
    ): Promise<StatusDurationTimePointDto[]> {
        const months = 6;
        const monthData: StatusDurationTimePointDto[] = [];

        const ptMonthNames = [
            'Jan',
            'Fev',
            'Mar',
            'Abr',
            'Mai',
            'Jun',
            'Jul',
            'Ago',
            'Set',
            'Out',
            'Nov',
            'Dez',
        ];

        for (let i = months - 1; i >= 0; i--) {
            const startDate = startOfMonth(subMonths(endDate, i));
            const endDateOfMonth = endOfMonth(startDate);

            const monthIndex = startDate.getMonth();
            const label = `${ptMonthNames[monthIndex]}/${startDate.getFullYear().toString().substr(2)}`;

            const { averageDurationSeconds, count } = await this.getAverageStatusDurationForPeriod(
                accessProfile,
                status,
                startDate,
                endDateOfMonth,
            );

            monthData.push({
                month: label,
                value: Math.round(averageDurationSeconds),
                count,
            });
        }

        return monthData;
    }

    private async getQuarterlyStatusDuration(
        accessProfile: AccessProfile,
        status: TicketStatus,
        endDate: Date,
    ): Promise<StatusDurationTimePointDto[]> {
        const quarters = 4;
        const quarterData: StatusDurationTimePointDto[] = [];

        for (let i = quarters - 1; i >= 0; i--) {
            const startDate = startOfQuarter(subQuarters(endDate, i));
            const endDateOfQuarter = endOfQuarter(startDate);

            const quarter = getQuarter(startDate);
            const year = startDate.getFullYear();
            const label = `T${quarter}/${year.toString().substr(2)}`;

            const { averageDurationSeconds, count } = await this.getAverageStatusDurationForPeriod(
                accessProfile,
                status,
                startDate,
                endDateOfQuarter,
            );

            quarterData.push({
                month: label,
                value: Math.round(averageDurationSeconds),
                count,
            });
        }

        return quarterData;
    }

    private async getAverageStatusDurationForPeriod(
        accessProfile: AccessProfile,
        status: TicketStatus,
        startDate: Date,
        endDate: Date,
    ): Promise<{ averageDurationSeconds: number; count: number }> {
        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        // Get all ticket updates for this period where the status changed from the requested status
        const qb = this.ticketUpdateRepository.createQueryBuilder('update');
        qb.innerJoin('update.ticket', 'ticket');
        qb.where('ticket.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        qb.andWhere('update.fromStatus = :status', { status });
        qb.andWhere('update.timeSecondsInLastStatus IS NOT NULL');
        qb.andWhere('update.createdAt >= :startDate', { startDate });
        qb.andWhere('update.updatedAt <= :endDate', { endDate });

        // Filter by department if Supervisor using EXISTS subquery
        if (supervisorDepartmentId !== null) {
            qb.andWhere(
                `EXISTS (
                    SELECT 1
                    FROM ticket_target_user ttu
                    INNER JOIN "user" u ON u.id = ttu."userId"
                    WHERE ttu."ticketId" = ticket.id
                    AND u."departmentId" = :departmentId
                )`,
                { departmentId: supervisorDepartmentId },
            );
        }

        const ticketUpdates = await qb.getMany();

        // Calculate average time spent in the status for this period
        let totalDurationSeconds = 0;
        const count = ticketUpdates.length;

        if (count > 0) {
            totalDurationSeconds = ticketUpdates.reduce(
                (sum, update) => sum + Number(update.timeSecondsInLastStatus || 0),
                0,
            );
            const averageDurationSeconds = totalDurationSeconds / count;
            return { averageDurationSeconds, count };
        }

        return { averageDurationSeconds: 0, count: 0 };
    }

    async getUserRanking(
        accessProfile: AccessProfile,
        limit: number = 5,
        returnAll: boolean = false,
        sort: string = 'top',
        period: StatsPeriod = StatsPeriod.TRIMESTRAL,
        sortBy: string = 'efficiency',
    ): Promise<UserRankingResponseDto> {
        const { dateFilter } = this.getPeriodFilter(period);

        // Check if user is Supervisor and get their departmentId
        const supervisorDepartmentId = await this.getSupervisorDepartmentId(accessProfile);

        const filters: any = {
            tenantId: accessProfile.tenantId,
            currentTargetUserId: Not(IsNull()),
            ...dateFilter,
        };

        const ticketStats = await this.ticketStatsRepository.find({
            where: filters,
        });

        // Filter by department if Supervisor
        let filteredTicketStats = ticketStats;
        if (supervisorDepartmentId !== null) {
            filteredTicketStats = ticketStats.filter(
                (stat) => stat.departmentIds && stat.departmentIds.includes(supervisorDepartmentId),
            );
        }

        // Filter out canceled tickets and only include finished tasks (Completed or Rejected)
        const completedTicketsMap: Map<number, { completedAt: Date | null; dueAt: Date | null }> =
            new Map();
        if (filteredTicketStats.length > 0) {
            const ticketIds = filteredTicketStats.map((stat) => stat.ticketId);
            const tickets = await this.ticketRepository.find({
                where: { id: In(ticketIds) },
                relations: ['ticketStatus'],
                select: ['id', 'ticketStatus', 'completedAt', 'dueAt'],
            });

            // Only include tickets that are Completed or Rejected (finished tasks)
            // Exclude Cancelled ones
            const finishedTicketIds = new Set(
                tickets
                    .filter(
                        (ticket) =>
                            ticket.ticketStatus?.key === TicketStatus.Completed ||
                            ticket.ticketStatus?.key === TicketStatus.Rejected,
                    )
                    .map((ticket) => ticket.id),
            );

            // Store completed tickets with their dates for overdue calculation
            tickets
                .filter((ticket) => finishedTicketIds.has(ticket.id))
                .forEach((ticket) => {
                    completedTicketsMap.set(ticket.id, {
                        completedAt: ticket.completedAt,
                        dueAt: ticket.dueAt,
                    });
                });

            filteredTicketStats = filteredTicketStats.filter((stat) =>
                finishedTicketIds.has(stat.ticketId),
            );
        }

        const allUsersQuery = this.userRepository.createQueryBuilder('user');
        allUsersQuery.where('user.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        allUsersQuery.leftJoinAndSelect('user.department', 'department');

        // If Supervisor, only get users from their department
        if (supervisorDepartmentId !== null) {
            allUsersQuery.andWhere('user.departmentId = :departmentId', {
                departmentId: supervisorDepartmentId,
            });
        }

        const allUsers = await allUsersQuery.getMany();

        // Create a map of users for quick lookup
        const userMap = new Map<number, User>();
        allUsers.forEach((user) => userMap.set(user.id, user));

        // Initialize stats for all users
        const userStatsMap = new Map<number, UserRankingItemDto>();

        // First, initialize entries for all active users (even those without tickets)
        for (const user of allUsers) {
            if (!user.isActive) continue;
            userStatsMap.set(user.id, {
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                departmentName: user.department?.name || 'N/A',
                totalTickets: 0,
                resolvedTickets: 0,
                resolutionRate: 0,
                efficiencyScore: 0,
                averageAcceptanceTimeSeconds: 0,
                averageResolutionTimeSeconds: 0,
                overdueRate: 0,
                avatarUrl: null,
                isActive: user.isActive,
            });
        }

        // Then count tickets for users who have them
        // Count tickets where user is currentTargetUserId OR in targetUserIds array
        for (const stat of filteredTicketStats) {
            // Get all users involved in this ticket (currentTargetUserId + all targetUserIds)
            const involvedUserIds = new Set<number>();

            if (stat.currentTargetUserId) {
                involvedUserIds.add(stat.currentTargetUserId);
            }

            if (stat.targetUserIds && Array.isArray(stat.targetUserIds)) {
                stat.targetUserIds.forEach((userId: number) => {
                    if (userId) {
                        involvedUserIds.add(userId);
                    }
                });
            }

            // Count this ticket for all involved users
            for (const userId of involvedUserIds) {
                if (!userStatsMap.has(userId)) continue;

                const userStats = userStatsMap.get(userId);
                userStats.totalTickets++;

                if (stat.isResolved) {
                    userStats.resolvedTickets++;
                }
            }
        }

        // Calculate average acceptance and resolution times for each user
        const { startDate } = this.getPeriodFilter(period);
        const userIds = Array.from(userStatsMap.keys());

        // Calculate average acceptance time for each user
        if (userIds.length > 0) {
            const acceptanceQuery = this.ticketUpdateRepository
                .createQueryBuilder('update')
                .leftJoinAndSelect('update.ticket', 'ticket')
                .where('update.fromStatus = :fromStatus', { fromStatus: TicketStatus.Pending })
                .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
                .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                .andWhere(
                    '(update.fromUserId IN (:...userIds) OR (update.fromUserId IS NULL AND ticket.currentTargetUserId IN (:...userIds)))',
                    { userIds },
                );

            if (startDate) {
                acceptanceQuery.andWhere('update.createdAt >= :startDate', { startDate });
            }

            const acceptanceUpdates = await acceptanceQuery.getMany();

            // Group by userId and calculate averages
            const acceptanceByUser = new Map<number, { sum: number; count: number }>();
            for (const update of acceptanceUpdates) {
                // Use fromUserId if available, otherwise fall back to currentTargetUserId for backward compatibility
                const userId = update.fromUserId || update.ticket?.currentTargetUserId;
                if (userId) {
                    const timeSeconds = update.timeSecondsInLastStatus || 0;
                    if (!acceptanceByUser.has(userId)) {
                        acceptanceByUser.set(userId, { sum: 0, count: 0 });
                    }
                    const stats = acceptanceByUser.get(userId)!;
                    stats.sum += timeSeconds;
                    stats.count += 1;
                }
            }

            // Calculate averages
            for (const [userId, stats] of acceptanceByUser.entries()) {
                if (userStatsMap.has(userId)) {
                    const userStats = userStatsMap.get(userId);
                    userStats.averageAcceptanceTimeSeconds =
                        stats.count > 0 ? stats.sum / stats.count : 0;
                }
            }
        }

        // Calculate average resolution time for each user
        if (userIds.length > 0) {
            const resolutionQuery = this.ticketUpdateRepository
                .createQueryBuilder('update')
                .leftJoinAndSelect('update.ticket', 'ticket')
                .where('update.fromStatus = :fromStatus', {
                    fromStatus: TicketStatus.InProgress,
                })
                .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
                .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                .andWhere(
                    '(update.fromUserId IN (:...userIds) OR (update.fromUserId IS NULL AND ticket.currentTargetUserId IN (:...userIds)))',
                    { userIds },
                );

            if (startDate) {
                resolutionQuery.andWhere('update.createdAt >= :startDate', { startDate });
            }

            const resolutionUpdates = await resolutionQuery.getMany();

            // Group by userId and calculate averages
            const resolutionByUser = new Map<number, { sum: number; count: number }>();
            for (const update of resolutionUpdates) {
                // Use fromUserId if available, otherwise fall back to currentTargetUserId for backward compatibility
                const userId = update.fromUserId || update.ticket?.currentTargetUserId;
                if (userId) {
                    const timeSeconds = update.timeSecondsInLastStatus || 0;
                    if (!resolutionByUser.has(userId)) {
                        resolutionByUser.set(userId, { sum: 0, count: 0 });
                    }
                    const stats = resolutionByUser.get(userId)!;
                    stats.sum += timeSeconds;
                    stats.count += 1;
                }
            }

            // Calculate averages
            for (const [userId, stats] of resolutionByUser.entries()) {
                if (userStatsMap.has(userId)) {
                    const userStats = userStatsMap.get(userId);
                    userStats.averageResolutionTimeSeconds =
                        stats.count > 0 ? stats.sum / stats.count : 0;
                }
            }
        }

        // Calculate overdue rate for each user
        const completedTicketsByUser = new Map<number, number>();
        const overdueTicketsByUser = new Map<number, number>();

        const ticketsWithDueAt = await this.ticketRepository.find({
            where: {
                id: In(filteredTicketStats.map((stat) => stat.ticketId)),
                completedAt: Not(IsNull()),
                dueAt: Not(IsNull()),
            },
            select: ['id', 'completedAt', 'dueAt', 'currentTargetUserId'],
            relations: ['targetUsers'],
        });

        // Get first verification updates for these tickets
        const ticketIdsWithDueAt = ticketsWithDueAt.map(t => t.id);
        const verificationMap = new Map<number, Date>();
        
        if (ticketIdsWithDueAt.length > 0) {
            const firstVerificationUpdates = await this.ticketUpdateRepository
                .createQueryBuilder('update')
                .select('update.ticketId', 'ticketId')
                .addSelect('MIN(update.createdAt)', 'firstVerificationAt')
                .where('update.ticketId IN (:...ticketIds)', { ticketIds: ticketIdsWithDueAt })
                .andWhere('update.toStatus = :status', { status: TicketStatus.AwaitingVerification })
                .groupBy('update.ticketId')
                .getRawMany();
            
            firstVerificationUpdates.forEach((update) => {
                verificationMap.set(update.ticketId, new Date(update.firstVerificationAt));
            });
        }

        for (const ticket of ticketsWithDueAt) {
            const involvedUserIds = new Set<number>();
            if (ticket.currentTargetUserId) {
                involvedUserIds.add(ticket.currentTargetUserId);
            }
            if (ticket.targetUsers) {
                ticket.targetUsers.forEach((ttu) => involvedUserIds.add(ttu.userId));
            }
            
            const firstVerificationAt = verificationMap.get(ticket.id);
            const isOverdue = firstVerificationAt && ticket.dueAt && firstVerificationAt > ticket.dueAt;
            
            const hasVerification = !!firstVerificationAt;

            for (const userId of involvedUserIds) {
                if (hasVerification) {
                   completedTicketsByUser.set(userId, (completedTicketsByUser.get(userId) || 0) + 1);
                   if (isOverdue) {
                       overdueTicketsByUser.set(userId, (overdueTicketsByUser.get(userId) || 0) + 1);
                   }
                }
            }
        }

        // Calculate resolution rate and Wilson Score (efficiency)
        const rankedUsers = Array.from(userStatsMap.values())
            .filter((user) => user.isActive)
            .map((user) => {
                user.resolutionRate =
                    user.totalTickets > 0
                        ? parseFloat((user.resolvedTickets / user.totalTickets).toFixed(2))
                        : 0;
                user.efficiencyScore = this.calculateWilsonScore(
                    user.resolvedTickets,
                    user.totalTickets,
                );

                // Calculate overdue rate
                const totalCompletedWithDueAt = completedTicketsByUser.get(user.userId) || 0;
                const totalOverdue = overdueTicketsByUser.get(user.userId) || 0;
                user.overdueRate =
                    totalCompletedWithDueAt > 0
                        ? parseFloat(((totalOverdue / totalCompletedWithDueAt) * 100).toFixed(2))
                        : 0;

                return user;
            })
            .filter((user) => {
                // When sorting by resolution time, exclude users with 0 seconds
                if (sortBy === 'resolution_time') {
                    return user.averageResolutionTimeSeconds > 0;
                }
                // When sorting by overdue rate, exclude users with no completed tickets with dueAt
                if (sortBy === 'overdue_rate') {
                    const completedCount = completedTicketsByUser.get(user.userId) || 0;
                    return completedCount > 0;
                }
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'resolution_time') {
                    // Sort by resolution time (lower is better)
                    if (sort === 'bottom') {
                        // Worst performers: highest resolution time first
                        return b.averageResolutionTimeSeconds - a.averageResolutionTimeSeconds;
                    } else {
                        // Top performers: lowest resolution time first
                        return a.averageResolutionTimeSeconds - b.averageResolutionTimeSeconds;
                    }
                } else if (sortBy === 'overdue_rate') {
                    // Sort by overdue rate (lower is better - fewer overdue tickets)
                    if (sort === 'bottom') {
                        // Worst performers: highest overdue rate first
                        return b.overdueRate - a.overdueRate;
                    } else {
                        // Top performers: lowest overdue rate first
                        return a.overdueRate - b.overdueRate;
                    }
                } else {
                    // Default: sort by efficiency score
                    if (sort === 'bottom') {
                        // Sort by efficiency score (ascending) for worst performers
                        return a.efficiencyScore - b.efficiencyScore;
                    } else {
                        // Sort by efficiency score (descending) for top performers
                        return b.efficiencyScore - a.efficiencyScore;
                    }
                }
            })
            .slice(0, returnAll ? undefined : limit);

        return { users: rankedUsers };
    }

    /**
     * Calculate Wilson Score for statistical correction of small sample sizes
     * Formula: Score = (p + z²/(2n) - z * sqrt((p(1-p)+z²/(4n))/n)) / (1+z²/n)
     * Where:
     *   p = success rate (resolved / total)
     *   n = total number of tasks
     *   z = 1.96 (95% confidence level)
     *
     * This method automatically penalizes rates with few data points.
     * Example: 100% with 1 task is much less reliable than 70% with 100 tasks.
     *
     * @param resolvedCount Number of resolved/resolved items
     * @param totalCount Total number of items
     * @returns Wilson Score between 0 and 1
     */
    calculateWilsonScore(resolvedCount: number, totalCount: number): number {
        if (totalCount === 0) {
            return 0;
        }

        const p = resolvedCount / totalCount; // Success rate
        const n = totalCount; // Total number of tasks
        const z = 1.96; // 95% confidence level

        // Calculate Wilson Score
        const zSquared = z * z;
        const denominator = 1 + zSquared / n;
        const numerator =
            p + zSquared / (2 * n) - z * Math.sqrt((p * (1 - p) + zSquared / (4 * n)) / n);

        const score = numerator / denominator;

        // Ensure score is between 0 and 1
        return Math.max(0, Math.min(1, score));
    }

    private async applyWeekendExclusion(items: TicketStats[]): Promise<TicketStats[]> {
        return Promise.all(
            items.map(async (stat) => {
                let adjustedResolutionTimeSeconds = stat.resolutionTimeSeconds;
                let adjustedAcceptanceTimeSeconds = stat.acceptanceTimeSeconds;

                // Apply weekend exclusion to resolution time
                if (stat.resolutionTimeSeconds !== null) {
                    const ticket = await this.ticketRepository.findOne({
                        where: { id: stat.ticketId },
                        select: ['acceptedAt', 'completedAt'],
                    });

                    if (ticket?.acceptedAt && ticket?.completedAt) {
                        const businessHours = this.businessHoursService.calculateBusinessHours(
                            ticket.acceptedAt,
                            ticket.completedAt,
                        );
                        adjustedResolutionTimeSeconds = businessHours * 3600;
                    }
                }

                // Apply weekend exclusion to acceptance time
                if (stat.acceptanceTimeSeconds !== null) {
                    const ticket = await this.ticketRepository.findOne({
                        where: { id: stat.ticketId },
                        select: ['createdAt', 'acceptedAt'],
                    });

                    if (ticket?.createdAt && ticket?.acceptedAt) {
                        const businessHours = this.businessHoursService.calculateBusinessHours(
                            ticket.createdAt,
                            ticket.acceptedAt,
                        );
                        adjustedAcceptanceTimeSeconds = businessHours * 3600;
                    }
                }

                return {
                    ...stat,
                    resolutionTimeSeconds: adjustedResolutionTimeSeconds,
                    acceptanceTimeSeconds: adjustedAcceptanceTimeSeconds,
                };
            }),
        );
    }
}
