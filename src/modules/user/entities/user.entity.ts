import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Department } from '../../department/entities/department.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { TicketTargetUser } from '../../ticket-target-user/entities/ticket-target-user.entity';
import { Role } from '../../role/entities/role.entity';

@Entity()
export class User extends TenantBoundBaseEntity {
    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ unique: true })
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

    @OneToMany(() => TicketTargetUser, (ticketTargetUser) => ticketTargetUser.user)
    assignedTickets: TicketTargetUser[];

    @OneToMany(() => Ticket, (ticket) => ticket.currentTargetUser)
    currentTickets: Ticket[];

    @OneToMany(() => Ticket, (ticket) => ticket.reviewer)
    reviewedTickets: Ticket[];

    @Column()
    roleId: number;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'roleId' })
    role: Role;

    @Column({ type: 'int', default: 0 })
    loginCount: number;

    @Column({ type: 'timestamp', nullable: true })
    lastLogin: Date | null;

    // Terms acceptance tracking
    @Column({ default: false })
    termsAccepted: boolean;

    @Column({ type: 'timestamp', nullable: true })
    termsAcceptedAt: Date | null;

    @Column({ nullable: true })
    termsVersion: string | null;

    @Column({ default: false })
    privacyPolicyAccepted: boolean;

    @Column({ type: 'timestamp', nullable: true })
    privacyPolicyAcceptedAt: Date | null;

    @Column({ nullable: true })
    privacyPolicyVersion: string | null;

    @Column({ default: false })
    completedOnboarding: boolean;
}
