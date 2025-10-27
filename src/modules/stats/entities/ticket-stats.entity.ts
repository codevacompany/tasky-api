import { DataSource, ViewColumn, ViewEntity } from 'typeorm';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { TicketTargetUser } from '../../ticket-target-user/entities/ticket-target-user.entity';

@ViewEntity({
    expression: (dataSource: DataSource) =>
        dataSource
            .createQueryBuilder()
            .select('ticket.id', 'id')
            .addSelect('ticket.createdAt', 'createdAt')
            .addSelect('ticket.updatedAt', 'updatedAt')
            .addSelect('ticket.id', 'ticketId')
            .addSelect('ticket.departmentId', 'departmentId')
            .addSelect('ticket.currentTargetUserId', 'currentTargetUserId')
            .addSelect('ticket.tenantId', 'tenantId')
            .addSelect(
                "CASE WHEN ticket.status = 'finalizado' THEN true ELSE false END",
                'isResolved',
            )
            .addSelect(
                'CASE WHEN ticket.completedAt IS NOT NULL AND ticket.acceptedAt IS NOT NULL THEN EXTRACT(EPOCH FROM (ticket.completedAt - ticket.acceptedAt)) ELSE NULL END',
                'resolutionTimeSeconds',
            )
            .addSelect(
                'CASE WHEN ticket.acceptedAt IS NOT NULL THEN EXTRACT(EPOCH FROM (ticket.acceptedAt - ticket.createdAt)) ELSE NULL END',
                'acceptanceTimeSeconds',
            )
            .addSelect('ARRAY_AGG(tu.userId ORDER BY tu.order)', 'targetUserIds')
            .leftJoin(TicketTargetUser, 'tu', 'tu.ticketId = ticket.id')
            .groupBy('ticket.id')
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
    departmentId: number;

    @ViewColumn()
    currentTargetUserId: number;

    @ViewColumn()
    targetUserIds: number[];

    @ViewColumn()
    tenantId: number;

    @ViewColumn()
    isResolved: boolean;

    @ViewColumn()
    resolutionTimeSeconds: number;

    @ViewColumn()
    acceptanceTimeSeconds: number;
}
