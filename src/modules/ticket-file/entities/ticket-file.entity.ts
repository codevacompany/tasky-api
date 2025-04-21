import { Column, Entity, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity()
export class TicketFile extends TenantBoundBaseEntity {
    @Column()
    url: string;

    @Column()
    name: string;

    @Column()
    mimeType: string;

    @ManyToOne(() => Ticket, (ticket) => ticket.files, { onDelete: 'CASCADE' })
    ticket: Ticket;

    @Column()
    ticketId: number;
}
