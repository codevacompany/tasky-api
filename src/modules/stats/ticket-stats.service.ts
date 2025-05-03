import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    endOfDay,
    endOfMonth,
    endOfWeek,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subDays,
    subMonths,
    subWeeks,
} from 'date-fns';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { QueryOptions } from '../../shared/types/http';
import { DepartmentService } from '../department/department.service';
import { Ticket, TicketPriority, TicketStatus } from '../ticket/entities/ticket.entity';
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
        // Define date filter based on period
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
                // No date filter
                break;
        }

        // Get all ticket stats for the tenant with date filter
        const filters = {
            where: {
                tenantId: accessProfile.tenantId,
                ...dateFilter,
            },
        };

        const [items, total] = await this.ticketStatsRepository.findAndCount(filters);
        const ticketStats = { items, total };

        // Get all departments for the tenant
        const departments = await this.departmentService.findMany(accessProfile, {
            paginated: false,
        });

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

        // Calculate stats by department
        const ticketsByDepartment: DepartmentStatsDto[] = departments.items.map((department) => {
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

        return {
            totalTickets,
            openTickets,
            closedTickets,
            averageResolutionTimeSeconds: avgResolutionTimeSeconds,
            averageAcceptanceTimeSeconds: avgAcceptanceTimeSeconds,
            averageTotalTimeSeconds: avgTotalTimeSeconds,
            resolutionRate: parseFloat(resolutionRate.toFixed(2)),
            ticketsByDepartment,
        };
    }

    async getTicketTrends(accessProfile: AccessProfile): Promise<TicketTrendsResponseDto> {
        const today = new Date();

        // Run all trend calculations in parallel
        const [daily, weekly, monthly] = await Promise.all([
            this.calculateDailyTrends(accessProfile, today, 30),
            this.calculateWeeklyTrends(accessProfile, today, 12),
            this.calculateMonthlyTrends(accessProfile, today, 6),
        ]);

        return {
            daily,
            weekly,
            monthly,
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

    private calculateAverage(values: (number | string | null | undefined)[]): number {
        // Filter out null, undefined and convert strings to numbers
        const validValues = values
            .filter((val) => val !== null && val !== undefined)
            .map((val) => (typeof val === 'string' ? parseFloat(val) : val))
            .filter((val) => !isNaN(val as number));

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
                targetUserId: userId,
                ...dateFilter,
            },
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
            averageResolutionTimeSeconds: avgResolutionTimeSeconds,
            averageAcceptanceTimeSeconds: avgAcceptanceTimeSeconds,
            averageTotalTimeSeconds: avgTotalTimeSeconds,
            resolutionRate: parseFloat(resolutionRate.toFixed(2)),
        };
    }
}
