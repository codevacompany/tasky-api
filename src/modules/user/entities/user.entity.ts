import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { Department } from '../../department/entities/department.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity()
export class User extends IdTimestampBaseEntity {
    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({ default: false })
    isAdmin: boolean;

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
}
