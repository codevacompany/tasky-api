import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Department } from '../../department/entities/department.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { Role } from '../../role/entities/role.entity';

@Entity()
export class User extends TenantBoundBaseEntity {
    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({ default: true })
    isActive: boolean;

    @Column()
    departmentId: number;

    @ManyToOne(() => Department, (department) => department.users)
    @JoinColumn({ name: 'departmentId' })
    department: Department;

    @OneToMany(() => Ticket, (ticket) => ticket.requester)
    createdTickets: Ticket[];

    @OneToMany(() => Ticket, (ticket) => ticket.targetUser)
    assignedTickets: Ticket[];

    @Column()
    roleId: number;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'roleId' })
    role: Role;
}
