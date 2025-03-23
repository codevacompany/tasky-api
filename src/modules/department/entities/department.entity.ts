import { Column, Entity, OneToMany } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { User } from '../../user/entities/user.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity()
export class Department extends IdTimestampBaseEntity {
    @Column()
    name: string;

    @OneToMany(() => User, (user) => user.department)
    users: User[];

    @OneToMany(() => Ticket, (ticket) => ticket.department)
    tickets: Ticket[];
}
