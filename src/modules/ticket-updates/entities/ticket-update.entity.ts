import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';
import { Department } from '../../department/entities/department.entity';

export enum TicketActionType {
    Creation = 'criação',
    StatusUpdate = 'mudança_de_status',
    Completion = 'finalização',
    Update = 'atualização',
    Cancellation = 'cancelamento',
    AssigneeChange = 'mudança_de_responsável',
    AssigneeRemove = 'remoção_de_responsável',
}

enum TicketUpdateTicketStatus {
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
export class TicketUpdate extends TenantBoundBaseEntity {
    @Column()
    ticketId: number;

    @ManyToOne(() => Ticket, (ticket) => ticket.updates, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column()
    ticketCustomId: string;

    @Column()
    performedById: number;

    @ManyToOne(() => User, { eager: true })
    performedBy: User;

    @Column({ type: 'enum', enum: TicketActionType })
    action: TicketActionType;

    @Column({ type: 'enum', enum: TicketUpdateTicketStatus, nullable: true })
    fromStatus?: string;

    @Column({ type: 'enum', enum: TicketUpdateTicketStatus, nullable: true })
    toStatus?: string;

    @Column({ nullable: true })
    timeSecondsInLastStatus?: number;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ nullable: true })
    fromUserId?: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'fromUserId' })
    fromUser?: User;

    @Column({ nullable: true })
    toUserId?: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'toUserId' })
    toUser?: User;

    @Column({ nullable: true })
    fromDepartmentId?: number;

    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'fromDepartmentId' })
    fromDepartment?: Department;

    @Column({ nullable: true })
    toDepartmentId?: number;

    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'toDepartmentId' })
    toDepartment?: Department;
}
