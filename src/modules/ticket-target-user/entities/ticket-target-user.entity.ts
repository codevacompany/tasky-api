import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
@Index(['tenantId', 'ticketId', 'order'], { unique: true })
export class TicketTargetUser extends TenantBoundBaseEntity {
    @Column()
    ticketId: number;

    @ManyToOne(() => Ticket, (ticket) => ticket.targetUsers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column()
    userId: number;

    @ManyToOne(() => User, (user) => user.assignedTickets)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    order: number;
}
