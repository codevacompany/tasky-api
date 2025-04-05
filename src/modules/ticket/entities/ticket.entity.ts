import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { Category } from '../../category/entities/category.entity';
import { Department } from '../../department/entities/department.entity';
import { TicketComment } from '../../ticket-comment/entities/ticket-comment.entity';
import { User } from '../../user/entities/user.entity';

export enum TicketPriority {
    Low = 'Baixa',
    Medium = 'Média',
    High = 'Alta',
}

export enum TicketStatus {
    Pending = 'Pendente',
    InProgress = 'Em andamento',
    AwaitingVerification = 'Aguardando verificação',
    Overdue = 'Atrasado',
    Completed = 'Finalizado',
    Returned = 'Devolvido',
    Rejected = 'Reprovado',
}

@Entity()
export class Ticket extends IdTimestampBaseEntity {
    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: TicketPriority,
        default: TicketPriority.Medium,
    })
    priority: TicketPriority;

    @Column('text')
    description: string;

    @Column()
    departmentId: number;

    @ManyToOne(() => Department, (department) => department.tickets)
    @JoinColumn({ name: 'departmentId' })
    department: Department;

    @Column()
    requesterId: number;

    @ManyToOne(() => User, (user) => user.createdTickets)
    @JoinColumn({ name: 'requesterId' })
    requester: User;

    @Column({ nullable: true })
    targetUserId: number;

    @ManyToOne(() => User, (user) => user.assignedTickets, { nullable: true })
    @JoinColumn({ name: 'targetUserId' })
    targetUser: User;

    @Column({
        type: 'enum',
        enum: TicketStatus,
        default: TicketStatus.Pending,
    })
    status: string;

    @Column('timestamp', { nullable: true })
    completionDate: Date | null;

    @Column('timestamp', { nullable: true })
    acceptanceDate: Date | null;

    @Column()
    categoryId: number;

    @ManyToOne(() => Category, (category) => category.tickets)
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @OneToMany(() => TicketComment, (ticketcomment) => ticketcomment.ticket)
    comments: TicketComment[];

    // @Column('text', { nullable: true })
    // disapprovalReason: string;
}
