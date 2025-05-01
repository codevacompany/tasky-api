import { Injectable } from '@nestjs/common';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { QueryOptions } from '../../shared/types/http';
import { DepartmentService } from '../department/department.service';
import { Ticket } from '../ticket/entities/ticket.entity';
import { DepartmentStatsDto, TicketStatsResponseDto } from './dtos/ticket-stats-response.dto';
import { TicketStats } from './entities/ticket-stats.entity';
import { TicketStatsRepository } from './ticket-stats.repository';

@Injectable()
export class TicketStatsService extends TenantBoundBaseService<TicketStats> {
    constructor(
        private readonly ticketStatsRepository: TicketStatsRepository,
        private readonly departmentService: DepartmentService,
    ) {
        super(ticketStatsRepository);
    }

    async create(accessProfile: AccessProfile, ticket: Ticket): Promise<TicketStats> {
        const statsExist = await this.findByTicketId(accessProfile, ticket.id, ticket.tenantId);

        if (statsExist) {
            throw new CustomConflictException({
                code: 'ticket-stats-already-exists',
                message: 'Ticket stats already exists',
            });
        }

        let resolutionTimeSeconds = null;
        let acceptanceTimeSeconds = null;
        const isResolved = ticket.status === 'finalizado';

        // Calculate resolution time if completed or rejected
        if (ticket.completedAt) {
            resolutionTimeSeconds = this.calculateTimeInSeconds(
                ticket.acceptedAt,
                new Date(ticket.completedAt),
            );
        }

        // Calculate acceptance time if accepted
        if (ticket.acceptedAt) {
            acceptanceTimeSeconds = this.calculateTimeInSeconds(
                ticket.createdAt,
                new Date(ticket.acceptedAt),
            );
        }

        return super.save(accessProfile, {
            ticketId: ticket.id,
            departmentId: ticket.departmentId,
            tenantId: ticket.tenantId,
            isResolved,
            resolutionTimeSeconds,
            acceptanceTimeSeconds,
        });
    }

    async findMany(accessProfile: AccessProfile, options?: QueryOptions<TicketStats>) {
        const filters = {
            ...options,
            order: { createdAt: 'DESC' } as any,
        };
        return super.findMany(accessProfile, filters);
    }

    async findByTicketId(
        accessProfile: AccessProfile,
        ticketId: number,
        tenantId: number,
    ): Promise<TicketStats> {
        return this.findOne(accessProfile, {
            where: { ticketId, tenantId },
        });
    }

    async getTenantStats(accessProfile: AccessProfile): Promise<TicketStatsResponseDto> {
        // Get all ticket stats for the tenant
        const ticketStats = await this.findMany(accessProfile, { paginated: false });

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

            const deptResolutionRate =
                totalDeptTickets > 0 ? resolvedDeptTickets / totalDeptTickets : 0;

            return {
                departmentId: department.id,
                departmentName: department.name,
                totalTickets: totalDeptTickets,
                resolvedTickets: resolvedDeptTickets,
                averageResolutionTimeSeconds: avgDeptResolutionTimeSeconds,
                resolutionRate: parseFloat(deptResolutionRate.toFixed(2)),
            };
        });

        return {
            totalTickets,
            openTickets,
            closedTickets,
            averageResolutionTimeSeconds: avgResolutionTimeSeconds,
            averageAcceptanceTimeSeconds: avgAcceptanceTimeSeconds,
            resolutionRate: parseFloat(resolutionRate.toFixed(2)),
            ticketsByDepartment,
        };
    }

    private calculateTimeInSeconds(startDate: Date, endDate: Date): number {
        const diff = endDate.getTime() - startDate.getTime();
        console.info('startDate', startDate);
        console.info('endDate', endDate);
        console.info('diff', diff);
        console.info('seconds', Math.floor(diff / 1000));
        return Math.floor(diff / 1000); // Convert to seconds
    }

    private calculateAverage(values: number[]): number {
        if (values.length === 0) return 0;
        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / values.length;
    }
}
