import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

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
}
