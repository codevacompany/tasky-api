import { DataSource, ViewColumn, ViewEntity } from 'typeorm';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { TicketTargetUser } from '../../ticket-target-user/entities/ticket-target-user.entity';
import { User } from '../../user/entities/user.entity';
import { TicketStatus } from '../../ticket-status/entities/ticket-status.entity';

@ViewEntity({
    expression: (dataSource: DataSource) =>
        dataSource
            .createQueryBuilder()
            .select('ticket.id', 'id')
            .addSelect('ticket.createdAt', 'createdAt')
            .addSelect('ticket.updatedAt', 'updatedAt')
            .addSelect('ticket.id', 'ticketId')
            .addSelect(
                'ARRAY_AGG(DISTINCT targetUser.departmentId) FILTER (WHERE targetUser.departmentId IS NOT NULL)',
                'departmentIds',
            )
            .addSelect('ticket.currentTargetUserId', 'currentTargetUserId')
            .addSelect('ticket.tenantId', 'tenantId')
            .addSelect('ticket.acceptedAt', 'acceptedAt')
            .addSelect('ticket.completedAt', 'completedAt')
            .addSelect('ticket.rejectedAt', 'rejectedAt')
            .addSelect('ticket.dueAt', 'dueAt')
            .addSelect('ticket.reviewerId', 'reviewerId')
            .addSelect('reviewer.departmentId', 'reviewerDepartmentId')
            .addSelect('ticketStatus.key', 'statusKey')
            .addSelect(
                'CASE WHEN ticket.completedAt IS NOT NULL THEN true ELSE false END',
                'isResolved',
            )
            .addSelect(
                'CASE WHEN ticket.rejectedAt IS NOT NULL THEN true ELSE false END',
                'isRejected',
            )
            .addSelect(
                'CASE WHEN ticket.canceledAt IS NOT NULL THEN true ELSE false END',
                'isCanceled',
            )
            .addSelect(
                'CASE WHEN ticket.completedAt IS NOT NULL OR ticket.rejectedAt IS NOT NULL THEN EXTRACT(EPOCH FROM (COALESCE(ticket.completedAt, ticket.rejectedAt) - ticket.createdAt)) ELSE NULL END',
                'totalTimeSeconds',
            )
            .addSelect(
                'CASE WHEN ticket.acceptedAt IS NOT NULL THEN EXTRACT(EPOCH FROM (ticket.acceptedAt - ticket.createdAt)) ELSE NULL END',
                'acceptanceTimeSeconds',
            )
            .addSelect('ARRAY_AGG(tu.userId ORDER BY tu.order)', 'targetUserIds')
            .leftJoin(TicketTargetUser, 'tu', 'tu.ticketId = ticket.id')
            .leftJoin(User, 'targetUser', 'targetUser.id = tu.userId')
            .leftJoin(User, 'reviewer', 'reviewer.id = ticket.reviewerId')
            .leftJoin(TicketStatus, 'ticketStatus', 'ticketStatus.id = ticket.statusId')
            .groupBy('ticket.id')
            .groupBy('ticket.createdAt')
            .groupBy('ticket.updatedAt')
            .groupBy('ticket.tenantId')
            .groupBy('ticket.currentTargetUserId')
            .groupBy('ticket.completedAt')
            .groupBy('ticket.acceptedAt')
            .groupBy('ticket.canceledAt')
            .groupBy('ticket.rejectedAt')
            .groupBy('ticket.dueAt')
            .groupBy('ticket.reviewerId')
            .groupBy('reviewer.departmentId')
            .groupBy('ticketStatus.key')
            .from(Ticket, 'ticket'),
})
export class TicketStats {
    @ViewColumn()
    id: number;

    @ViewColumn()
    createdAt: Date;

    @ViewColumn()
    updatedAt: Date;

    @ViewColumn()
    ticketId: number;

    @ViewColumn()
    departmentIds: number[];

    @ViewColumn()
    currentTargetUserId: number;

    @ViewColumn()
    targetUserIds: number[];

    @ViewColumn()
    tenantId: number;

    @ViewColumn()
    isResolved: boolean;

    @ViewColumn()
    isRejected: boolean;

    @ViewColumn()
    isCanceled: boolean;

    @ViewColumn()
    acceptedAt: Date | null;

    @ViewColumn()
    completedAt: Date | null;

    @ViewColumn()
    rejectedAt: Date | null;

    @ViewColumn()
    dueAt: Date | null;

    @ViewColumn()
    reviewerId: number | null;

    @ViewColumn()
    reviewerDepartmentId: number | null;

    @ViewColumn()
    statusKey: string;

    @ViewColumn()
    totalTimeSeconds: number;

    @ViewColumn()
    acceptanceTimeSeconds: number;
}
