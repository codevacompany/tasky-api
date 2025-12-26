import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    endOfDay,
    endOfMonth,
    endOfQuarter,
    endOfWeek,
    getQuarter,
    isBefore,
    isEqual,
    startOfDay,
    startOfMonth,
    startOfQuarter,
    startOfWeek,
    subDays,
    subMonths,
    subQuarters,
    subWeeks,
} from 'date-fns';
import { ArrayContains, In, IsNull, LessThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
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

interface TicketLifeCycleInfo {
    ticketId: number;
    isClosed: boolean;
    isResolved: boolean;
    isOnTime: boolean;
    firstAwaitingVerificationAt: Date | null;
    verificationCycles: Array<{
        startTime: Date;
        endTime: Date;
        reviewerId: number | null;
        reviewerDeptId: number | null;
        onTime: boolean;
    }>;
    isRejected: boolean;
    wasReturned: boolean;
    returnedToUserIds: number[];
    returnedToDepartmentIds: number[];
}

interface DetailedMetrics {
    onTimeCompleted: number;
    totalCompleted: number;
    onTimeVerified: number;
    totalVerified: number;
    totalClosed: number;
    rejectedCount: number;
    returnedCount: number;
    totalEntries: number;
}

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
        const filters: any = {
            where: {
                tenantId: accessProfile.tenantId,
                ...dateFilter,
            },
            ...(limit ? { take: limit } : {}),
            ...(order ? { order } : {}),
        };

        // Filter by department if Supervisor
        if (supervisorDepartmentId !== null) {
            filters.where.departmentIds = ArrayContains([supervisorDepartmentId]);
        }

        // Filter out canceled tickets if requested
        if (excludeCanceled) {
            filters.where.isCanceled = false;
        }

        const [filteredStatsItems] = await this.ticketStatsRepository.findAndCount(filters);

        const itemsWithWeekendExclusion = await this.applyWeekendExclusion(filteredStatsItems);
        const ticketStats = { items: itemsWithWeekendExclusion, total: filteredStatsItems.length };

        const filteredTicketIds = ticketStats.items.map((stat) => stat.ticketId);

        // Calculate overall stats
        const totalTickets = ticketStats.items.length;
        const resolvedTickets = ticketStats.items.filter((stat) => stat.isResolved).length;
        const closedTickets = ticketStats.items.filter(
            (stat) => stat.isResolved || stat.isRejected,
        ).length;
        const openTickets = totalTickets - closedTickets;

        // Calculate resolution rate
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
                resolutionTicketIds.size > 0 ? resolutionTimeSum / resolutionTicketIds.size : 0;

            // Calculate average acceptance time directly from ticket stats items
            const acceptanceTimes = ticketStats.items
                .map((stat) => stat.acceptanceTimeSeconds)
                .filter((time) => time !== null);

            avgAcceptanceTimeSeconds =
                acceptanceTimes.length > 0
                    ? acceptanceTimes.reduce((sum, time) => sum + time, 0) / acceptanceTimes.length
                    : 0;
        }

        // Calculate tenant-wide metrics for the score
        const finishedTicketIds = this.getFinishedTicketIds(itemsWithWeekendExclusion);
        const updates = await this.getTicketUpdates(accessProfile, finishedTicketIds);

        const updatesByTicket = new Map<number, TicketUpdate[]>();
        updates.forEach((u) => {
            if (!updatesByTicket.has(u.ticketId)) updatesByTicket.set(u.ticketId, []);
            updatesByTicket.get(u.ticketId).push(u);
        });

        const lifeCycleMap = new Map<number, TicketLifeCycleInfo>();
        const finishedItems = itemsWithWeekendExclusion.filter((s) =>
            finishedTicketIds.includes(s.ticketId),
        );

        finishedItems.forEach((stat) => {
            lifeCycleMap.set(
                stat.ticketId,
                this.analyzeTicketLifeCycle(stat, updatesByTicket.get(stat.ticketId) || []),
            );
        });

        // Sum up metrics for the whole tenant/selection
        let onTimeCompleted = 0;
        let totalCompleted = 0;
        let onTimeVerified = 0;
        let totalVerified = 0;
        let rejectedCount = 0;
        let returnedCount = 0;
        const totalEntries = finishedItems.length;

        lifeCycleMap.forEach((lc) => {
            if (lc.isResolved) {
                totalCompleted++;
                if (lc.isOnTime) onTimeCompleted++;
                if (lc.wasReturned) returnedCount++;
            }

            if (lc.isRejected) rejectedCount++;

            lc.verificationCycles.forEach((vc) => {
                totalVerified++;
                if (vc.onTime) onTimeVerified++;
            });
        });

        const efficiencyScore = this.calculateComprehensiveScore(
            onTimeCompleted,
            totalCompleted,
            onTimeVerified,
            totalVerified,
            rejectedCount,
            returnedCount,
            totalEntries,
        );

        const deliveryOverdueRate =
            totalCompleted > 0 ? ((totalCompleted - onTimeCompleted) / totalCompleted) * 100 : 0;

        return {
            totalTickets,
            openTickets,
            closedTickets,
            resolvedTickets,
            averageResolutionTimeSeconds: avgResolutionTimeSeconds,
            averageAcceptanceTimeSeconds: avgAcceptanceTimeSeconds,
            resolutionRate: parseFloat(resolutionRate.toFixed(2)),
            efficiencyScore: parseFloat(efficiencyScore.toFixed(2)),
            deliveryOverdueRate: parseFloat(deliveryOverdueRate.toFixed(2)),
        };
    }

    async getDepartmentStats(
        accessProfile: AccessProfile,
        period: StatsPeriod = StatsPeriod.ALL,
        sortBy: string = 'efficiency',
    ): Promise<DepartmentStatsDto[]> {
        const { dateFilter, startDate } = this.getPeriodFilter(period);
        const supervisorDeptId = await this.getSupervisorDepartmentId(accessProfile);

        // 1. Fetch and filter base statistics
        const [statsItems] = await this.ticketStatsRepository.findAndCount({
            where: { tenantId: accessProfile.tenantId, isCanceled: false, ...dateFilter },
        });

        const filteredStatsItems =
            supervisorDeptId !== null
                ? statsItems.filter((s) => s.departmentIds?.includes(supervisorDeptId))
                : statsItems;

        if (filteredStatsItems.length === 0) return [];

        // 2. Fetch Core Data and Analyze Lifecycle
        const finishedTicketIds = this.getFinishedTicketIds(filteredStatsItems);
        const updates = await this.getTicketUpdates(accessProfile, finishedTicketIds);

        const updatesByTicket = new Map<number, TicketUpdate[]>();
        updates.forEach((u) => {
            if (!updatesByTicket.has(u.ticketId)) updatesByTicket.set(u.ticketId, []);
            updatesByTicket.get(u.ticketId).push(u);
        });

        const lifeCycleMap = new Map<number, TicketLifeCycleInfo>();
        const finishedStatsItems = filteredStatsItems.filter((s) =>
            finishedTicketIds.includes(s.ticketId),
        );

        finishedStatsItems.forEach((stat) => {
            lifeCycleMap.set(
                stat.ticketId,
                this.analyzeTicketLifeCycle(stat, updatesByTicket.get(stat.ticketId) || []),
            );
        });

        const deptDetailedMetrics = this.aggregateMetricsByDepartment(
            finishedStatsItems,
            lifeCycleMap,
        );

        // 3. Apply Legacy Adjustments (Weekend Exclusion)
        const statsItemsWithExclusion = await this.applyWeekendExclusion(filteredStatsItems);

        // 4. Fetch and Process Departments
        const departmentsRes = await this.departmentService.findMany(accessProfile, {
            paginated: false,
        });
        const deptsToProcess =
            supervisorDeptId !== null
                ? departmentsRes.items.filter((d) => d.id === supervisorDeptId)
                : departmentsRes.items;

        const results = await Promise.all(
            deptsToProcess.map(async (dept) => {
                const deptTicketStats = statsItemsWithExclusion.filter((s) =>
                    s.departmentIds?.includes(dept.id),
                );
                const metrics = deptDetailedMetrics.get(dept.id);

                const { avgResolutionTime, avgAcceptanceTime } =
                    await this.calculateDepartmentAverages(accessProfile, dept.id, startDate);

                let efficiencyScore = 0;
                let resolutionRate = 0;
                let deliveryOverdueRate = 0;

                if (metrics) {
                    resolutionRate =
                        metrics.totalEntries > 0
                            ? metrics.totalCompleted / metrics.totalEntries
                            : 0;
                    efficiencyScore = this.calculateComprehensiveScore(
                        metrics.onTimeCompleted,
                        metrics.totalCompleted,
                        metrics.onTimeVerified,
                        metrics.totalVerified,
                        metrics.rejectedCount,
                        metrics.returnedCount,
                        metrics.totalEntries,
                    );
                    deliveryOverdueRate =
                        metrics.totalCompleted > 0
                            ? ((metrics.totalCompleted - metrics.onTimeCompleted) /
                                  metrics.totalCompleted) *
                              100
                            : 0;
                }

                return {
                    departmentId: dept.id,
                    departmentName: dept.name,
                    totalTickets: deptTicketStats.length,
                    resolvedTickets: deptTicketStats.filter((s) => s.isResolved).length,
                    resolutionRate: parseFloat(resolutionRate.toFixed(2)),
                    efficiencyScore,
                    deliveryOverdueRate: parseFloat(deliveryOverdueRate.toFixed(2)),
                    averageResolutionTimeSeconds: avgResolutionTime,
                    averageAcceptanceTimeSeconds: avgAcceptanceTime,
                    userCount: await this.userRepository.count({
                        where: {
                            tenantId: accessProfile.tenantId,
                            departmentId: dept.id,
                            isActive: true,
                        },
                    }),
                };
            }),
        );

        // 5. Sorting
        return results.sort((a, b) => {
            const direction = sortBy.startsWith('-') ? -1 : 1;
            const key = sortBy.replace('-', '');

            const aValue = (a as any)[key] || 0;
            const bValue = (b as any)[key] || 0;

            if (key === 'efficiencyScore' || key === 'resolutionRate') {
                return (bValue - aValue) * direction;
            }
            return (aValue - bValue) * direction;
        });
    }

    private async calculateDepartmentAverages(
        accessProfile: AccessProfile,
        deptId: number,
        startDate: Date | null,
    ): Promise<{ avgResolutionTime: number; avgAcceptanceTime: number }> {
        const getQuery = (status: TicketStatus) => {
            const qb = this.ticketUpdateRepository
                .createQueryBuilder('update')
                .leftJoin('update.fromUser', 'fromUser')
                .leftJoin('update.ticket', 'ticket')
                .leftJoin('ticket.currentTargetUser', 'currentTargetUser')
                .where('update.fromStatus = :status', { status })
                .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
                .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                .andWhere(
                    `CASE
                        WHEN update.fromDepartmentId IS NOT NULL THEN update.fromDepartmentId = :deptId
                        WHEN update.fromUserId IS NOT NULL THEN fromUser.departmentId = :deptId
                        ELSE currentTargetUser.departmentId = :deptId
                    END`,
                    { deptId },
                );

            if (startDate) qb.andWhere('update.createdAt >= :startDate', { startDate });
            return qb;
        };

        const acceptanceQuery = this.ticketStatsRepository
            .createQueryBuilder('stats')
            .where('stats.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere('stats.departmentIds @> ARRAY[:deptId]::integer[]', { deptId })
            .andWhere('stats.acceptanceTimeSeconds IS NOT NULL');

        if (startDate) {
            acceptanceQuery.andWhere('stats.createdAt >= :startDate', { startDate });
        }

        const statsWithAcceptanceTime = await acceptanceQuery.getMany();
        const itemsWithWeekendExclusion = await this.applyWeekendExclusion(statsWithAcceptanceTime);

        const avgAcceptanceTime =
            itemsWithWeekendExclusion.length > 0
                ? itemsWithWeekendExclusion.reduce((s, st) => s + st.acceptanceTimeSeconds, 0) /
                  itemsWithWeekendExclusion.length
                : 0;

        const resUpdates = await getQuery(TicketStatus.InProgress).getMany();

        const calc = (updates: TicketUpdate[]) => {
            if (updates.length === 0) return 0;
            const sum = updates.reduce((s, u) => s + (u.timeSecondsInLastStatus || 0), 0);
            const ticketIds = new Set(updates.map((u) => u.ticketId));
            return ticketIds.size > 0 ? sum / ticketIds.size : 0;
        };

        return {
            avgResolutionTime: calc(resUpdates),
            avgAcceptanceTime,
        };
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

        const qb = this.ticketStatsRepository.createQueryBuilder('ticketStats');
        qb.where('ticketStats.tenantId = :tenantId', { tenantId: accessProfile.tenantId });
        qb.andWhere('ticketStats.isCanceled = false');

        qb.andWhere(
            '(ticketStats.currentTargetUserId = :userId OR ticketStats.targetUserIds @> ARRAY[:userId]::integer[])',
            { userId },
        );

        if (startDate) {
            qb.andWhere('ticketStats.createdAt >= :startDate', { startDate });
        }

        // Apply order if provided
        if (order) {
            Object.entries(order).forEach(([field, direction]) => {
                qb.addOrderBy(`ticketStats.${field}`, direction === 'ASC' ? 'ASC' : 'DESC');
            });
        } else {
            qb.addOrderBy('ticketStats.createdAt', 'DESC');
        }

        if (limit) {
            qb.take(limit);
        }

        const [statsItems, total] = await qb.getManyAndCount();

        if (total === 0) {
            return {
                totalTickets: 0,
                openTickets: 0,
                closedTickets: 0,
                resolvedTickets: 0,
                averageResolutionTimeSeconds: 0,
                averageAcceptanceTimeSeconds: 0,
                resolutionRate: 0,
                efficiencyScore: 0,
                deliveryOverdueRate: 0,
            };
        }

        const statsItemsWithWeekendExclusion = await this.applyWeekendExclusion(statsItems);
        const ticketStats = { items: statsItemsWithWeekendExclusion, total };

        const totalTickets = ticketStats.items.length;
        const resolvedTickets = ticketStats.items.filter((stat) => stat.isResolved).length;
        const closedTickets = ticketStats.items.filter(
            (stat) => stat.isResolved || stat.isRejected,
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

        // Calculate average acceptance time directly from ticket stats items
        const acceptanceTimes = ticketStats.items
            .map((stat) => stat.acceptanceTimeSeconds)
            .filter((time) => time !== null);

        const avgAcceptanceTimeSeconds =
            acceptanceTimes.length > 0
                ? acceptanceTimes.reduce((sum, time) => sum + time, 0) / acceptanceTimes.length
                : 0;

        const finishedTicketIds = this.getFinishedTicketIds(statsItemsWithWeekendExclusion);
        const updates = await this.getTicketUpdates(accessProfile, finishedTicketIds);

        const updatesByTicket = new Map<number, TicketUpdate[]>();
        updates.forEach((u) => {
            if (!updatesByTicket.has(u.ticketId)) updatesByTicket.set(u.ticketId, []);
            updatesByTicket.get(u.ticketId).push(u);
        });

        const lifeCycleMap = new Map<number, TicketLifeCycleInfo>();
        const finishedItems = statsItemsWithWeekendExclusion.filter((s) =>
            finishedTicketIds.includes(s.ticketId),
        );

        finishedItems.forEach((stat) => {
            lifeCycleMap.set(
                stat.ticketId,
                this.analyzeTicketLifeCycle(stat, updatesByTicket.get(stat.ticketId) || []),
            );
        });

        const userDetailedMetricsMap = this.aggregateMetricsByUser(finishedItems, lifeCycleMap);
        const userMetrics = userDetailedMetricsMap.get(userId) || {
            onTimeCompleted: 0,
            totalCompleted: 0,
            onTimeVerified: 0,
            totalVerified: 0,
            rejectedCount: 0,
            returnedCount: 0,
            totalEntries: 0,
        };

        const completionIndex = this.calculateWilsonScore(
            userMetrics.onTimeCompleted,
            userMetrics.totalCompleted,
        );
        const verificationIndex =
            userMetrics.totalVerified > 0
                ? Math.max(0, userMetrics.onTimeVerified / userMetrics.totalVerified)
                : 1;
        const rejectionIndex =
            userMetrics.totalEntries > 0
                ? Math.max(0, 1 - userMetrics.rejectedCount / userMetrics.totalEntries)
                : 1;
        const returnIndex =
            userMetrics.totalEntries > 0
                ? Math.max(0, 1 - userMetrics.returnedCount / userMetrics.totalEntries)
                : 1;

        const efficiencyScore = this.calculateComprehensiveScore(
            userMetrics.onTimeCompleted,
            userMetrics.totalCompleted,
            userMetrics.onTimeVerified,
            userMetrics.totalVerified,
            userMetrics.rejectedCount,
            userMetrics.returnedCount,
            userMetrics.totalEntries,
        );

        const deliveryOverdueRate =
            userMetrics.totalCompleted > 0
                ? ((userMetrics.totalCompleted - userMetrics.onTimeCompleted) /
                      userMetrics.totalCompleted) *
                  100
                : 0;

        return {
            totalTickets,
            openTickets,
            closedTickets,
            resolvedTickets,
            averageResolutionTimeSeconds: avgResolutionTimeSeconds,
            averageAcceptanceTimeSeconds: avgAcceptanceTimeSeconds,
            resolutionRate: parseFloat(resolutionRate.toFixed(2)),
            efficiencyScore: parseFloat(efficiencyScore.toFixed(2)),
            deliveryOverdueRate: parseFloat(deliveryOverdueRate.toFixed(2)),
            detailedMetrics: {
                onTimeCompleted: userMetrics.onTimeCompleted,
                totalCompleted: userMetrics.totalCompleted,
                onTimeVerified: userMetrics.onTimeVerified,
                totalVerified: userMetrics.totalVerified,
                rejectedCount: userMetrics.rejectedCount,
                returnedCount: userMetrics.returnedCount,
                totalEntries: userMetrics.totalEntries,
                completionIndex: parseFloat(completionIndex.toFixed(2)),
                verificationIndex: parseFloat(verificationIndex.toFixed(2)),
                rejectionIndex: parseFloat(rejectionIndex.toFixed(2)),
                returnIndex: parseFloat(returnIndex.toFixed(2)),
            },
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

        const resolutionTicketIds = new Set(resolutionUpdates.map((update) => update.ticketId));
        const avgResolutionTimeSeconds =
            resolutionTicketIds.size > 0 ? resolutionTimeSum / resolutionTicketIds.size : 0;

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
        const { dateFilter, startDate } = this.getPeriodFilter(period);
        const supervisorDeptId = await this.getSupervisorDepartmentId(accessProfile);

        // 1. Fetch and filter base statistics
        const ticketStats = await this.ticketStatsRepository.find({
            where: {
                tenantId: accessProfile.tenantId,
                currentTargetUserId: Not(IsNull()),
                ...dateFilter,
            },
        });

        const filteredStats =
            supervisorDeptId !== null
                ? ticketStats.filter((s) => s.departmentIds?.includes(supervisorDeptId))
                : ticketStats;

        if (filteredStats.length === 0) {
            return { users: [], total: 0, topContributor: null };
        }

        // 2. Fetch Core Data and Analyze Lifecycle
        const finishedTicketIds = this.getFinishedTicketIds(filteredStats);
        const updates = await this.getTicketUpdates(accessProfile, finishedTicketIds);

        const updatesByTicket = new Map<number, TicketUpdate[]>();
        updates.forEach((u) => {
            if (!updatesByTicket.has(u.ticketId)) updatesByTicket.set(u.ticketId, []);
            updatesByTicket.get(u.ticketId).push(u);
        });

        const lifeCycleMap = new Map<number, TicketLifeCycleInfo>();
        const finishedItems = filteredStats.filter((s) => finishedTicketIds.includes(s.ticketId));

        finishedItems.forEach((stat) => {
            lifeCycleMap.set(
                stat.ticketId,
                this.analyzeTicketLifeCycle(stat, updatesByTicket.get(stat.ticketId) || []),
            );
        });

        const userDetailedMetrics = this.aggregateMetricsByUser(finishedItems, lifeCycleMap);

        // 3. Initialize User Map and Stats
        const allUsersQuery = this.userRepository
            .createQueryBuilder('user')
            .where('user.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .leftJoinAndSelect('user.department', 'department');

        if (supervisorDeptId !== null) {
            allUsersQuery.andWhere('user.departmentId = :deptId', { deptId: supervisorDeptId });
        }

        const allUsers = await allUsersQuery.getMany();
        const userStatsMap = new Map<number, UserRankingItemDto>();

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
                deliveryOverdueRate: 0,
                avatarUrl: null,
                isActive: user.isActive,
            });
        }

        // 4. Count Involvements
        for (const stat of filteredStats) {
            const involved = new Set([
                stat.currentTargetUserId,
                ...(Array.isArray(stat.targetUserIds) ? stat.targetUserIds : []),
            ]);
            involved.forEach((userId) => {
                const s = userStatsMap.get(userId);
                if (s) {
                    s.totalTickets++;
                    if (stat.isResolved) s.resolvedTickets++;
                }
            });
        }

        // 5. Calculate Average Times
        const userIds = Array.from(userStatsMap.keys());
        if (userIds.length > 0) {
            await this.populateUserAverageTimes(accessProfile, userIds, startDate, userStatsMap);
        }

        // 6. Final Mapping and Score Calculation
        const rankedUsers = Array.from(userStatsMap.values())
            .filter((u) => u.isActive)
            .map((user) => {
                const m = userDetailedMetrics.get(user.userId);
                if (m) {
                    user.resolutionRate =
                        m.totalEntries > 0
                            ? parseFloat((m.totalCompleted / m.totalEntries).toFixed(2))
                            : 0;
                    user.efficiencyScore = this.calculateComprehensiveScore(
                        m.onTimeCompleted,
                        m.totalCompleted,
                        m.onTimeVerified,
                        m.totalVerified,
                        m.rejectedCount,
                        m.returnedCount,
                        m.totalEntries,
                    );
                    user.deliveryOverdueRate =
                        m.totalCompleted > 0
                            ? parseFloat(
                                  (
                                      ((m.totalCompleted - m.onTimeCompleted) / m.totalCompleted) *
                                      100
                                  ).toFixed(2),
                              )
                            : 0;
                }
                return user;
            })
            .filter((user) => {
                if (sortBy === 'resolution_time') return user.averageResolutionTimeSeconds > 0;
                if (sortBy === 'overdue_rate')
                    return (userDetailedMetrics.get(user.userId)?.totalCompleted || 0) > 0;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'resolution_time') {
                    return sort === 'bottom'
                        ? b.averageResolutionTimeSeconds - a.averageResolutionTimeSeconds
                        : a.averageResolutionTimeSeconds - b.averageResolutionTimeSeconds;
                } else if (sortBy === 'overdue_rate') {
                    return sort === 'bottom'
                        ? b.deliveryOverdueRate - a.deliveryOverdueRate
                        : a.deliveryOverdueRate - b.deliveryOverdueRate;
                } else {
                    return sort === 'bottom'
                        ? a.efficiencyScore - b.efficiencyScore
                        : b.efficiencyScore - a.efficiencyScore;
                }
            });

        const total = rankedUsers.length;
        const topContributor = total > 0 ? rankedUsers[0] : null;

        return {
            users: returnAll ? rankedUsers : rankedUsers.slice(0, limit),
            total,
            topContributor,
        };
    }

    private async populateUserAverageTimes(
        accessProfile: AccessProfile,
        userIds: number[],
        startDate: Date | null,
        userStatsMap: Map<number, UserRankingItemDto>,
    ): Promise<void> {
        const fetchAverages = async (status: TicketStatus) => {
            const qb = this.ticketUpdateRepository
                .createQueryBuilder('update')
                .leftJoinAndSelect('update.ticket', 'ticket')
                .where('update.fromStatus = :status', { status })
                .andWhere('update.timeSecondsInLastStatus IS NOT NULL')
                .andWhere('update.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
                .andWhere(
                    '(update.fromUserId IN (:...userIds) OR (update.fromUserId IS NULL AND ticket.currentTargetUserId IN (:...userIds)))',
                    { userIds },
                );

            if (startDate) qb.andWhere('update.createdAt >= :startDate', { startDate });
            return qb.getMany();
        };

        const [acceptanceUpdates, resolutionUpdates] = await Promise.all([
            fetchAverages(TicketStatus.Pending),
            fetchAverages(TicketStatus.InProgress),
        ]);

        const aggregate = (updates: TicketUpdate[]) => {
            const stats = new Map<number, { sum: number; count: number }>();
            updates.forEach((u) => {
                const userId = u.fromUserId || u.ticket?.currentTargetUserId;
                if (userId && userStatsMap.has(userId)) {
                    if (!stats.has(userId)) stats.set(userId, { sum: 0, count: 0 });
                    const s = stats.get(userId)!;
                    s.sum += u.timeSecondsInLastStatus || 0;
                    s.count++;
                }
            });
            return stats;
        };

        const accMap = aggregate(acceptanceUpdates);
        const resMap = aggregate(resolutionUpdates);

        userStatsMap.forEach((user, userId) => {
            const acc = accMap.get(userId);
            if (acc) user.averageAcceptanceTimeSeconds = acc.sum / acc.count;

            const res = resMap.get(userId);
            if (res) user.averageResolutionTimeSeconds = res.sum / res.count;
        });
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

    /**
     * Calculates a comprehensive performance score based on weighted indices:
     * 1. On-time completion (35%) - Wilson corrected
     * 2. On-time verification (30%) - Wilson corrected
     * 3. Quality / Rejection rate (25%)
     * 4. Quality / Return rate (10%)
     */
    private calculateComprehensiveScore(
        onTimeCompleted: number,
        totalCompleted: number,
        onTimeVerified: number,
        totalVerified: number,
        rejectedCount: number,
        returnedTickets: number,
        totalEntries: number,
    ): number {
        const completionIndex = this.calculateWilsonScore(onTimeCompleted, totalCompleted);
        const verificationIndex =
            totalVerified > 0 ? Math.max(0, onTimeVerified / totalVerified) : 1;
        const rejectionIndex =
            totalEntries > 0 ? Math.max(0, 1 - rejectedCount / totalCompleted) : 1;
        const returnIndex =
            totalEntries > 0 ? Math.max(0, 1 - returnedTickets / totalCompleted) : 1;

        const score =
            completionIndex * 0.4 +
            returnIndex * 0.3 +
            verificationIndex * 0.15 +
            rejectionIndex * 0.15;

        return Math.max(0, Math.min(1, score));
    }

    private async applyWeekendExclusion(items: TicketStats[]): Promise<TicketStats[]> {
        return items.map((stat) => {
            let adjustedTotalTimeSeconds = stat.totalTimeSeconds;
            let adjustedAcceptanceTimeSeconds = stat.acceptanceTimeSeconds;

            // Apply weekend exclusion to total time (creation to completion or rejection)
            const closedAt = stat.completedAt || stat.rejectedAt;
            if (stat.totalTimeSeconds !== null && stat.createdAt && closedAt) {
                const businessHours = this.businessHoursService.calculateBusinessHours(
                    stat.createdAt,
                    closedAt,
                );
                adjustedTotalTimeSeconds = businessHours * 3600;
            }

            // Apply weekend exclusion to acceptance time
            if (stat.acceptanceTimeSeconds !== null && stat.createdAt && stat.acceptedAt) {
                const businessHours = this.businessHoursService.calculateBusinessHours(
                    stat.createdAt,
                    stat.acceptedAt,
                );
                adjustedAcceptanceTimeSeconds = businessHours * 3600;
            }

            return {
                ...stat,
                totalTimeSeconds: adjustedTotalTimeSeconds,
                acceptanceTimeSeconds: adjustedAcceptanceTimeSeconds,
            };
        });
    }

    async getUserStatsList(
        accessProfile: AccessProfile,
        page: number = 1,
        limit: number = 10,
        search: string = '',
        period: StatsPeriod = StatsPeriod.TRIMESTRAL,
        sortBy: string = 'efficiency',
        sortDirection: 'asc' | 'desc' = 'desc',
    ): Promise<PaginatedResponse<UserRankingItemDto>> {
        const allStatsResponse = await this.getUserRanking(
            accessProfile,
            undefined, // No limit
            true, // Return all
            'top', // Default sort
            period,
            'efficiency', // Default sort
        );

        let users = allStatsResponse.users;

        // 1. Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(
                (u) =>
                    u.firstName.toLowerCase().includes(searchLower) ||
                    u.lastName.toLowerCase().includes(searchLower) ||
                    u.email.toLowerCase().includes(searchLower) ||
                    u.departmentName.toLowerCase().includes(searchLower),
            );
        }

        // 2. Sort
        if (sortBy) {
            users.sort((a, b) => {
                const aValue = (a as any)[sortBy];
                const bValue = (b as any)[sortBy];

                if (aValue === bValue) return 0;
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                const comparison = aValue < bValue ? -1 : 1;
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        // 3. Paginate
        const total = users.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedUsers = users.slice(startIndex, endIndex);

        return {
            items: paginatedUsers,
            total,
            page,
            limit,
            totalPages,
        };
    }
    async getDepartmentStatsList(
        accessProfile: AccessProfile,
        page: number = 1,
        limit: number = 10,
        search: string = '',
        period: StatsPeriod = StatsPeriod.ALL,
        sortBy: string = 'efficiencyScore',
        sortDirection: 'asc' | 'desc' = 'desc',
    ): Promise<PaginatedResponse<DepartmentStatsDto>> {
        let departments = await this.getDepartmentStats(accessProfile, period, 'efficiency');

        // 1. Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            departments = departments.filter((d) =>
                d.departmentName.toLowerCase().includes(searchLower),
            );
        }

        // 2. Sort
        if (sortBy) {
            departments.sort((a, b) => {
                const aValue = (a as any)[sortBy];
                const bValue = (b as any)[sortBy];

                if (aValue === bValue) return 0;
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortDirection === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }

                const comparison = aValue < bValue ? -1 : 1;
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        // 3. Paginate
        const total = departments.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedDepartments = departments.slice(startIndex, endIndex);

        return {
            items: paginatedDepartments,
            total,
            page,
            limit,
            totalPages,
        };
    }
    private getFinishedTicketIds(items: TicketStats[]): number[] {
        return items.filter((s) => s.isResolved || s.isRejected).map((s) => s.ticketId);
    }

    private async getTicketUpdates(
        accessProfile: AccessProfile,
        ticketIds: number[],
    ): Promise<TicketUpdate[]> {
        if (ticketIds.length === 0) return [];
        return this.ticketUpdateRepository.find({
            where: { ticketId: In(ticketIds), tenantId: accessProfile.tenantId },
            order: { createdAt: 'ASC' },
            relations: ['fromUser'],
        });
    }

    private analyzeTicketLifeCycle(
        stat: TicketStats,
        updates: TicketUpdate[],
    ): TicketLifeCycleInfo {
        let firstAwaitingVerificationAt: Date | null = null;
        let lastAwaitingVerificationAt: Date | null = null;
        let currentVerificationStart: Date | null = null;
        let currentReviewerId: number | null = null;
        let currentReviewerDeptId: number | null = null;
        let isRejected = false;
        let wasReturned = false;
        const returnedToUserIds: number[] = [];
        const returnedToDepartmentIds: number[] = [];
        const verificationCycles: TicketLifeCycleInfo['verificationCycles'] = [];

        for (const update of updates) {
            // Reset submission timestamps if ticket is retracted from verification back to in progress
            if (
                update.fromStatus === TicketStatus.AwaitingVerification &&
                update.toStatus === TicketStatus.InProgress
            ) {
                firstAwaitingVerificationAt = null;
                lastAwaitingVerificationAt = null;
            }

            // Track submission for completionIndex and track last entry for verification SLA
            if (update.toStatus === TicketStatus.AwaitingVerification) {
                if (!firstAwaitingVerificationAt) firstAwaitingVerificationAt = update.createdAt;
                lastAwaitingVerificationAt = update.createdAt;
            }

            // Track verification cycles for verificationIndex
            if (update.toStatus === TicketStatus.UnderVerification) {
                currentVerificationStart = update.createdAt;
                currentReviewerId = stat.reviewerId;
                currentReviewerDeptId = stat.reviewerDepartmentId;
            }

            if (
                currentVerificationStart &&
                [TicketStatus.Completed, TicketStatus.Rejected, TicketStatus.Returned].includes(
                    update.toStatus as TicketStatus,
                )
            ) {
                // End of verification must be within 24h of being sent to AwaitingVerification
                const slaStart = lastAwaitingVerificationAt || currentVerificationStart;
                const durationHrs = this.businessHoursService.calculateBusinessHours(
                    slaStart,
                    update.createdAt,
                );
                verificationCycles.push({
                    startTime: currentVerificationStart,
                    endTime: update.createdAt,
                    reviewerId: currentReviewerId,
                    reviewerDeptId: currentReviewerDeptId,
                    onTime: durationHrs <= 24,
                });
                currentVerificationStart = null;
                currentReviewerId = null;
                currentReviewerDeptId = null;
                // We keep lastAwaitingVerificationAt until a new one arrives or it's reset to InProgress
            }

            if (update.toStatus === TicketStatus.Rejected) isRejected = true;
            if (update.toStatus === TicketStatus.Returned) {
                wasReturned = true;
                returnedToUserIds.push(update.toUserId);
                returnedToDepartmentIds.push(update.toDepartmentId);
            }
        }

        const isClosed = stat.isResolved || stat.isRejected;
        const isResolved = stat.isResolved;
        const isOnTime =
            isClosed &&
            firstAwaitingVerificationAt &&
            stat.dueAt &&
            (isBefore(firstAwaitingVerificationAt, stat.dueAt) ||
                isEqual(firstAwaitingVerificationAt, stat.dueAt));

        return {
            ticketId: stat.ticketId,
            isClosed,
            isResolved,
            isOnTime: !!isOnTime,
            firstAwaitingVerificationAt,
            verificationCycles,
            isRejected,
            wasReturned,
            returnedToUserIds,
            returnedToDepartmentIds,
        };
    }

    private aggregateMetricsByUser(
        stats: TicketStats[],
        lifeCycleMap: Map<number, TicketLifeCycleInfo>,
    ): Map<number, DetailedMetrics> {
        const userMetrics = new Map<number, DetailedMetrics>();

        const getM = (userId: number) => {
            if (!userMetrics.has(userId)) {
                userMetrics.set(userId, {
                    onTimeCompleted: 0,
                    totalCompleted: 0,
                    onTimeVerified: 0,
                    totalVerified: 0,
                    totalClosed: 0,
                    rejectedCount: 0,
                    returnedCount: 0,
                    totalEntries: 0,
                });
            }
            return userMetrics.get(userId);
        };

        for (const stat of stats) {
            const lifeCycle = lifeCycleMap.get(stat.ticketId);
            if (!lifeCycle) continue;

            // Assignees metrics
            const assignees = new Set<number>();
            if (stat.currentTargetUserId) assignees.add(stat.currentTargetUserId);
            stat.targetUserIds?.forEach((userId) => assignees.add(userId));

            assignees.forEach((userId) => {
                const m = getM(userId);
                m.totalEntries++;
                if (lifeCycle.isClosed) {
                    m.totalClosed++;
                }

                if (lifeCycle.isResolved) {
                    m.totalCompleted++;
                    if (lifeCycle.isOnTime) m.onTimeCompleted++;
                    if (lifeCycle.wasReturned) {
                        if (stat.targetUserIds.length > 1 && lifeCycle.returnedToUserIds.includes(userId)) {
                            m.returnedCount++;
                        }

                        if (stat.targetUserIds.length === 1) {
                            m.returnedCount++;
                        }
                    }
                }

                if (lifeCycle.isRejected) m.rejectedCount++;
            });

            // Reviewer metrics
            lifeCycle.verificationCycles.forEach((cycle) => {
                if (cycle.reviewerId) {
                    const m = getM(cycle.reviewerId);
                    m.totalVerified++;
                    if (cycle.onTime) m.onTimeVerified++;
                }
            });
        }

        return userMetrics;
    }

    private aggregateMetricsByDepartment(
        stats: TicketStats[],
        lifeCycleMap: Map<number, TicketLifeCycleInfo>,
    ): Map<number, DetailedMetrics> {
        const deptMetrics = new Map<number, DetailedMetrics>();

        const getM = (deptId: number) => {
            if (!deptMetrics.has(deptId)) {
                deptMetrics.set(deptId, {
                    onTimeCompleted: 0,
                    totalCompleted: 0,
                    onTimeVerified: 0,
                    totalVerified: 0,
                    totalClosed: 0,
                    rejectedCount: 0,
                    returnedCount: 0,
                    totalEntries: 0,
                });
            }
            return deptMetrics.get(deptId);
        };

        for (const stat of stats) {
            const lifeCycle = lifeCycleMap.get(stat.ticketId);
            if (!lifeCycle || !stat.departmentIds) continue;

            // Assignee departments metrics
            stat.departmentIds.forEach((deptId) => {
                const m = getM(deptId);
                m.totalEntries++;
                if (lifeCycle.isClosed) {
                    m.totalClosed++;
                }

                if (lifeCycle.isResolved) {
                    m.totalCompleted++;
                    if (lifeCycle.wasReturned) {
                        if (stat.departmentIds.length > 1 && lifeCycle.returnedToDepartmentIds.includes(deptId)) {
                            m.returnedCount++;
                        }

                        if (stat.departmentIds.length === 1) {
                            m.returnedCount++;
                        }
                    }
                    if (lifeCycle.isOnTime) m.onTimeCompleted++;
                }

                if (lifeCycle.isRejected) m.rejectedCount++;
            });

            // Reviewer department metrics
            lifeCycle.verificationCycles.forEach((cycle) => {
                if (cycle.reviewerDeptId) {
                    const m = getM(cycle.reviewerDeptId);
                    m.totalVerified++;
                    if (cycle.onTime) m.onTimeVerified++;
                }
            });
        }

        return deptMetrics;
    }
}
