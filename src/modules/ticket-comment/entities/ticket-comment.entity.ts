import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class TicketComment extends IdTimestampBaseEntity {
    @Column()
    ticketId: number;

    @ManyToOne(() => Ticket, (ticket) => ticket.comments)
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @ManyToOne(() => User)
    user: User;

    @Column('text')
    content: string;
}
