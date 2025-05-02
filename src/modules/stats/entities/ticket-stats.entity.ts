import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Department } from '../../department/entities/department.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class TicketStats extends TenantBoundBaseEntity {
    @Column()
    ticketId: number;

    @ManyToOne(() => Ticket)
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column()
    departmentId: number;

    @ManyToOne(() => Department)
    @JoinColumn({ name: 'departmentId' })
    department: Department;

    @Column({ nullable: true })
    targetUserId: number;

    @ManyToOne(() => Department)
    @JoinColumn({ name: 'targetUserId' })
    targetUser: User;

    @Column({ default: false })
    isResolved: boolean;

    @Column('int', { nullable: true })
    resolutionTimeSeconds: number;

    @Column('int', { nullable: true })
    acceptanceTimeSeconds: number;
}
