import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { TicketChecklistItem } from './ticket-checklist-item.entity';

@Entity()
export class TicketChecklist extends TenantBoundBaseEntity {
    @Column()
    title: string;

    @ManyToOne(() => Ticket, (ticket) => ticket.checklists, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column()
    ticketId: number;

    @OneToMany(() => TicketChecklistItem, (item) => item.checklist, { cascade: true })
    items: TicketChecklistItem[];

    @Column({ default: 0 })
    order: number;
}
