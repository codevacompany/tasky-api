import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Category } from '../../category/entities/category.entity';
import { CorrectionRequest } from '../../correction-request-reason/entities/correction-request-reason.entity';
import { TicketCancellationReason } from '../../ticket-cancellation-reason/entities/ticket-cancellation-reason.entity';
import { TicketChecklistItem } from '../../ticket-checklist/entities/ticket-checklist-item.entity';
import { TicketComment } from '../../ticket-comment/entities/ticket-comment.entity';
import { TicketDisapprovalReason } from '../../ticket-disapproval-reason/entities/ticket-disapproval-reason.entity';
import { TicketFile } from '../../ticket-file/entities/ticket-file.entity';
import { TicketTargetUser } from '../../ticket-target-user/entities/ticket-target-user.entity';
import { TicketUpdate } from '../../ticket-updates/entities/ticket-update.entity';
import { User } from '../../user/entities/user.entity';
import { TicketStatus as TicketStatusEntity } from '../../ticket-status/entities/ticket-status.entity';

export enum TicketPriority {
    Low = 'baixa',
    Medium = 'média',
    High = 'alta',
}

export enum TicketStatus {
    Pending = 'pendente',
    InProgress = 'em_andamento',
    AwaitingVerification = 'aguardando_verificação',
    UnderVerification = 'em_verificação',
    Completed = 'finalizado',
    Canceled = 'cancelado',
    Returned = 'devolvido',
    Rejected = 'reprovado',
}

@Entity()
@Index(['tenantId', 'customId'], { unique: true })
export class Ticket extends TenantBoundBaseEntity {
    @Column()
    customId: string;

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
    requesterId: number;

    @ManyToOne(() => User, (user) => user.createdTickets)
    @JoinColumn({ name: 'requesterId' })
    requester: User;

    @OneToMany(() => TicketTargetUser, (ticketTargetUser) => ticketTargetUser.ticket, {
        cascade: true,
    })
    targetUsers: TicketTargetUser[];

    @Column({ nullable: true })
    currentTargetUserId: number;

    @ManyToOne(() => User, (user) => user.currentTickets, { nullable: true })
    @JoinColumn({ name: 'currentTargetUserId' })
    currentTargetUser: User;

    @Column({ nullable: true })
    reviewerId: number;

    @ManyToOne(() => User, (user) => user.reviewedTickets, { nullable: true })
    @JoinColumn({ name: 'reviewerId' })
    reviewer: User;

    @Column()
    statusId: number;

    @ManyToOne(() => TicketStatusEntity, (ticketStatus) => ticketStatus.tickets)
    @JoinColumn({ name: 'statusId' })
    ticketStatus: TicketStatusEntity;

    @Column('timestamp', { nullable: true })
    acceptedAt: Date | null;

    @Column('timestamp', { nullable: true })
    dueAt: Date | null;

    @Column('timestamp', { nullable: true })
    completedAt: Date | null;

    @Column('timestamp', { nullable: true })
    canceledAt: Date | null;

    @Column({ nullable: true })
    categoryId: number;

    @ManyToOne(() => Category, (category) => category.tickets)
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @OneToMany(() => TicketComment, (ticketcomment) => ticketcomment.ticket)
    comments: TicketComment[];

    @Column({ default: false })
    isPrivate: boolean;

    @OneToMany(() => TicketUpdate, (update) => update.ticket)
    updates: TicketUpdate[];

    @OneToMany(() => TicketFile, (file) => file.ticket, { cascade: true })
    files: TicketFile[];

    @OneToMany(() => TicketChecklistItem, (item) => item.ticket, { cascade: true })
    checklistItems: TicketChecklistItem[];

    @OneToOne(() => TicketCancellationReason, (reason) => reason.ticket, { nullable: true })
    cancellationReason: TicketCancellationReason;

    @OneToOne(() => TicketDisapprovalReason, (reason) => reason.ticket, { nullable: true })
    disapprovalReason: TicketDisapprovalReason;

    @OneToMany(() => CorrectionRequest, (reason) => reason.ticket)
    correctionRequests: CorrectionRequest[];
}
