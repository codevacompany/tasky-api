import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { Tag } from './tag.entity';

@Entity()
@Index(['ticketId', 'tagId'], { unique: true })
export class TicketTag extends TenantBoundBaseEntity {
    @Column()
    ticketId: number;

    @ManyToOne(() => Ticket, (ticket) => ticket.ticketTags, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column()
    tagId: number;

    @ManyToOne(() => Tag, (tag) => tag.ticketTags, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'tagId' })
    tag: Tag;
}
