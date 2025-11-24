import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { User } from '../../user/entities/user.entity';

export enum NotificationType {
    Open = 'abertura',
    Comment = 'comentário',
    StatusUpdate = 'atualização_de_status',
    TicketUpdate = 'atualização',
    Cancellation = 'cancelamento',
    Disapproval = 'reprovação',
    CorrectionRequest = 'solicitação_de_correção',
}

@Entity()
export class Notification extends TenantBoundBaseEntity {
    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column('text')
    message: string;

    @Column({ default: false })
    read: boolean;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @Column({ nullable: true })
    createdById: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'createdById' })
    createdBy: User;

    @Column()
    targetUserId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'targetUserId' })
    targetUser: User;

    @Column({ nullable: true })
    resourceId: number;

    @Column({ nullable: true })
    resourceCustomId: string;
}
