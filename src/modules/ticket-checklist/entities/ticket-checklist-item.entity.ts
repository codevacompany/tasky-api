import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { User } from '../../user/entities/user.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity()
export class TicketChecklistItem extends TenantBoundBaseEntity {
    @Column()
    title: string;

    @Column({ default: false })
    isCompleted: boolean;

    @ManyToOne(() => Ticket, (ticket) => ticket.checklistItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column()
    ticketId: number;

    @Column({ nullable: true })
    assignedToId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'assignedToId' })
    assignedTo: User;

    @Column('timestamp', { nullable: true })
    dueDate: Date | null;

    @Column({ default: 0 })
    order: number;
}
