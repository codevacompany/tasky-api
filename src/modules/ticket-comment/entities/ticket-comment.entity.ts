import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class TicketComment extends TenantBoundBaseEntity {
    @Column()
    ticketId: number;

    @ManyToOne(() => Ticket, (ticket) => ticket.comments)
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column()
    ticketCustomId: string;

    @Column()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column('text')
    content: string;
}
