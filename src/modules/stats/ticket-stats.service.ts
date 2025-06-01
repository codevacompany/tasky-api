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
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { QueryOptions } from '../../shared/types/http';
import { DepartmentService } from '../department/department.service';
import { TicketUpdate } from '../ticket-updates/entities/ticket-update.entity';
import { Ticket, TicketPriority, TicketStatus } from '../ticket/entities/ticket.entity';
import { ResolutionTimeResponseDto } from './dtos/resolution-time.dto';
import { StatusDurationDto, StatusDurationResponseDto } from './dtos/status-duration.dto';
import {
    TicketPriorityCountDto,
    TicketPriorityCountResponseDto,
} from './dtos/ticket-priority-count.dto';
import { DepartmentStatsDto, TicketStatsResponseDto } from './dtos/ticket-stats-response.dto';
import { TicketStatusCountDto, TicketStatusCountResponseDto } from './dtos/ticket-status-count.dto';
import { TicketTrendsResponseDto, TrendDataPointDto } from './dtos/ticket-trends.dto';
import { TicketStats } from './entities/ticket-stats.entity';
import { StatsPeriod } from './stats.controller';

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
    ) {}

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
    ): Promise<TicketStatsResponseDto> {
        let dateFilter = {};
        let limit = undefined;
        let order = undefined;
        const now = new Date();

        switch (period) {
            case StatsPeriod.WEEKLY:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subDays(now, 7))) };
                break;
            case StatsPeriod.MONTHLY:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subDays(now, 30))) };
                break;
            case StatsPeriod.TRIMESTRAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 3))) };
                break;
            case StatsPeriod.SEMESTRAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 6))) };
                break;
            case StatsPeriod.ANNUAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 12))) };
                break;
            case StatsPeriod.ALL:
            default:
                // Get the last 50 tickets stats instead of all
                limit = 50;
                order = { createdAt: 'DESC' };
                break;
        }

        // Get ticket stats for the tenant with date filter
        const filters = {
            where: {
                tenantId: accessProfile.tenantId,
                ...dateFilter,
            },
            ...(limit ? { take: limit } : {}),
            ...(order ? { order } : {}),
        };

        const [items, total] = await this.ticketStatsRepository.findAndCount(filters);
        const ticketStats = { items, total };

        // Calculate overall stats
        const totalTickets = ticketStats.items.length;
        const resolvedTickets = ticketStats.items.filter((stat) => stat.isResolved).length;
        const closedTickets = ticketStats.items.filter(
            (stat) => stat.resolutionTimeSeconds !== null,
        ).length;
        const openTickets = totalTickets - closedTickets;

        // Calculate resolution and acceptance rates
        const resolutionRate = closedTickets > 0 ? resolvedTickets / closedTickets : 0;

        // Calculate average resolution and acceptance times
        const avgResolutionTimeSeconds = this.calculateAverage(
            ticketStats.items
                .filter((stat) => stat.resolutionTimeSeconds !== null)
                .map((stat) => stat.resolutionTimeSeconds),
        );

        const avgAcceptanceTimeSeconds = this.calculateAverage(
            ticketStats.items
                .filter((stat) => stat.acceptanceTimeSeconds !== null)
                .map((stat) => stat.acceptanceTimeSeconds),
        );

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
    ): Promise<DepartmentStatsDto[]> {
        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case StatsPeriod.WEEKLY:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subDays(now, 7))) };
                break;
            case StatsPeriod.MONTHLY:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subDays(now, 30))) };
                break;
            case StatsPeriod.TRIMESTRAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 3))) };
                break;
            case StatsPeriod.SEMESTRAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 6))) };
                break;
            case StatsPeriod.ANNUAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 12))) };
                break;
            case StatsPeriod.ALL:
            default:
                break;
        }

        const filters = {
            where: {
                tenantId: accessProfile.tenantId,
                ...dateFilter,
            },
        };

        const [items, total] = await this.ticketStatsRepository.findAndCount(filters);
        const ticketStats = { items, total };

        const departments = await this.departmentService.findMany(accessProfile, {
            paginated: false,
        });

        return departments.items.map((department) => {
            const departmentTickets = ticketStats.items.filter(
                (stat) => stat.departmentId === department.id,
            );
            const totalDeptTickets = departmentTickets.length;
            const resolvedDeptTickets = departmentTickets.filter((stat) => stat.isResolved).length;

            const avgDeptResolutionTimeSeconds = this.calculateAverage(
                departmentTickets
                    .filter((stat) => stat.resolutionTimeSeconds !== null)
                    .map((stat) => stat.resolutionTimeSeconds),
            );

            const avgDeptAcceptanceTimeSeconds = this.calculateAverage(
                departmentTickets
                    .filter((stat) => stat.acceptanceTimeSeconds !== null)
                    .map((stat) => stat.acceptanceTimeSeconds),
            );

            const avgDeptTotalTimeSeconds =
                avgDeptAcceptanceTimeSeconds + avgDeptResolutionTimeSeconds;

            const deptResolutionRate =
                totalDeptTickets > 0 ? resolvedDeptTickets / totalDeptTickets : 0;

            return {
                departmentId: department.id,
                departmentName: department.name,
                totalTickets: totalDeptTickets,
                resolvedTickets: resolvedDeptTickets,
                averageResolutionTimeSeconds: avgDeptResolutionTimeSeconds,
                averageAcceptanceTimeSeconds: avgDeptAcceptanceTimeSeconds,
                averageTotalTimeSeconds: avgDeptTotalTimeSeconds,
                resolutionRate: parseFloat(deptResolutionRate.toFixed(2)),
            };
        });
    }

    async getTicketTrends(accessProfile: AccessProfile): Promise<TicketTrendsResponseDto> {
        const today = new Date();

        // Run all trend calculations in parallel
        const [daily, weekly, monthly, trimestral] = await Promise.all([
            this.calculateDailyTrends(accessProfile, today, 30),
            this.calculateWeeklyTrends(accessProfile, today, 12),
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

        const tickets = await this.ticketRepository.find({
            where: {
                tenantId: accessProfile.tenantId,
                createdAt: MoreThanOrEqual(startOfRange),
            },
            select: ['id', 'createdAt', 'completedAt', 'status'],
        });

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
                    ticket.status === TicketStatus.Completed,
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

        const tickets = await this.ticketRepository.find({
            where: {
                tenantId: accessProfile.tenantId,
                createdAt: MoreThanOrEqual(startOfRange),
            },
            select: ['id', 'createdAt', 'completedAt', 'status'],
        });

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
                    ticket.status === TicketStatus.Completed,
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

        const tickets = await this.ticketRepository.find({
            where: {
                tenantId: accessProfile.tenantId,
                createdAt: MoreThanOrEqual(startOfRange),
            },
            select: ['id', 'createdAt', 'completedAt', 'status'],
        });

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
                    ticket.status === TicketStatus.Completed,
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

        const tickets = await this.ticketRepository.find({
            where: {
                tenantId: accessProfile.tenantId,
                createdAt: MoreThanOrEqual(startOfRange),
            },
            select: ['id', 'createdAt', 'completedAt', 'status'],
        });

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
                    ticket.status === TicketStatus.Completed,
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

    async getTicketsByStatus(accessProfile: AccessProfile): Promise<TicketStatusCountResponseDto> {
        const tickets = await this.ticketRepository.find({
            where: { tenantId: accessProfile.tenantId },
            select: ['id', 'status'],
        });

        const total = tickets.length;
        const statusMap = new Map<string, number>();

        Object.values(TicketStatus).forEach((status) => {
            statusMap.set(status, 0);
        });

        tickets.forEach((ticket) => {
            const currentCount = statusMap.get(ticket.status) || 0;
            statusMap.set(ticket.status, currentCount + 1);
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
    ): Promise<TicketPriorityCountResponseDto> {
        const tickets = await this.ticketRepository.find({
            where: { tenantId: accessProfile.tenantId },
            select: ['id', 'priority'],
        });

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
        let dateFilter = {};
        let limit = undefined;
        let order = undefined;
        const now = new Date();

        switch (period) {
            case StatsPeriod.WEEKLY:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subDays(now, 7))) };
                break;
            case StatsPeriod.MONTHLY:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subDays(now, 30))) };
                break;
            case StatsPeriod.TRIMESTRAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 3))) };
                break;
            case StatsPeriod.SEMESTRAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 6))) };
                break;
            case StatsPeriod.ANNUAL:
                dateFilter = { createdAt: MoreThanOrEqual(startOfDay(subMonths(now, 12))) };
                break;
            case StatsPeriod.ALL:
            default:
                // Get the last 50 tickets stats instead of all
                limit = 50;
                order = { createdAt: 'DESC' };
                break;
        }

        const filters = {
            where: {
                tenantId: accessProfile.tenantId,
                targetUserId: userId,
                ...dateFilter,
            },
            ...(limit ? { take: limit } : {}),
            ...(order ? { order } : {}),
        };

        const [items, total] = await this.ticketStatsRepository.findAndCount(filters);
        const ticketStats = { items, total };

        const totalTickets = ticketStats.items.length;
        const resolvedTickets = ticketStats.items.filter((stat) => stat.isResolved).length;
        const closedTickets = ticketStats.items.filter(
            (stat) => stat.resolutionTimeSeconds !== null,
        ).length;
        const openTickets = totalTickets - closedTickets;

        const resolutionRate = closedTickets > 0 ? resolvedTickets / closedTickets : 0;

        const avgResolutionTimeSeconds = this.calculateAverage(
            ticketStats.items
                .filter((stat) => stat.resolutionTimeSeconds !== null)
                .map((stat) => stat.resolutionTimeSeconds),
        );

        const avgAcceptanceTimeSeconds = this.calculateAverage(
            ticketStats.items
                .filter((stat) => stat.acceptanceTimeSeconds !== null)
                .map((stat) => stat.acceptanceTimeSeconds),
        );

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
        let startDate = null;
        const now = new Date();

        switch (period) {
            case StatsPeriod.WEEKLY:
                startDate = startOfDay(subDays(now, 7));
                break;
            case StatsPeriod.MONTHLY:
                startDate = startOfDay(subDays(now, 30));
                break;
            case StatsPeriod.TRIMESTRAL:
                startDate = startOfDay(subMonths(now, 3));
                break;
            case StatsPeriod.SEMESTRAL:
                startDate = startOfDay(subMonths(now, 6));
                break;
            case StatsPeriod.ANNUAL:
                startDate = startOfDay(subMonths(now, 12));
                break;
            case StatsPeriod.ALL:
            default:
                break;
        }

        const queryOptions: any = {
            where: {
                tenantId: accessProfile.tenantId,
                timeSecondsInLastStatus: Not(IsNull()),
            },
        };

        if (startDate) {
            queryOptions.where.createdAt = MoreThanOrEqual(startDate);
        }

        const ticketUpdates = await this.ticketUpdateRepository.find(queryOptions);

        const statusDurationsMap = new Map<string, { total: number; count: number }>();

        Object.values(TicketStatus).forEach((status) => {
            statusDurationsMap.set(status, { total: 0, count: 0 });
        });

        ticketUpdates.forEach((update) => {
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

        const statusDurations: StatusDurationDto[] = Array.from(statusDurationsMap.entries())
            .map(([status, data]) => ({
                status: status as TicketStatus,
                totalDurationSeconds: data.total,
                count: data.count,
                averageDurationSeconds: data.count > 0 ? Math.round(data.total / data.count) : 0,
            }))
            .filter((item) => item.count > 0); // Only include statuses with data

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
        const ticketStats = await this.ticketStatsRepository.find({
            where: {
                tenantId: accessProfile.tenantId,
                isResolved: true,
                resolutionTimeSeconds: Not(IsNull()),
                createdAt: MoreThanOrEqual(startDate),
                updatedAt: LessThanOrEqual(endDate),
            },
        });

        if (ticketStats.length === 0) {
            return 0;
        }

        const totalResolutionTimeSeconds = ticketStats.reduce(
            (sum, stat) => sum + Number(stat.resolutionTimeSeconds),
            0,
        );

        const avgResolutionTimeHours = totalResolutionTimeSeconds / ticketStats.length / 3600;

        return Math.round(avgResolutionTimeHours * 10) / 10;
    }
}
