import { Column, Entity, OneToMany } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity()
export class Category extends TenantBoundBaseEntity {
    @Column()
    name: string;

    @OneToMany(() => Ticket, (ticket) => ticket.category)
    tickets: Ticket[];
}
