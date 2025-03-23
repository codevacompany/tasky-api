import { Column, Entity, OneToMany } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity()
export class Category extends IdTimestampBaseEntity {
    @Column()
    name: string;

    @OneToMany(() => Ticket, (ticket) => ticket.category)
    tickets: Ticket[];
}
