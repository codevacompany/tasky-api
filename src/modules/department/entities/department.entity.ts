import { Column, Entity, OneToMany, Unique } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
@Unique(['name', 'tenantId'])
export class Department extends TenantBoundBaseEntity {
    @Column()
    name: string;

    @OneToMany(() => User, (user) => user.department)
    users: User[];

    @OneToMany(() => Ticket, (ticket) => ticket.department)
    tickets: Ticket[];
}
