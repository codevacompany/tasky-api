import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { TicketStatus } from '../../ticket-status/entities/ticket-status.entity';

@Entity()
@Index(['tenantId', 'fromStatusId', 'toStatusId'], { unique: true })
export class StatusAction extends TenantBoundBaseEntity {
    @Column()
    fromStatusId: number;

    @ManyToOne(() => TicketStatus, (status) => status.actions)
    @JoinColumn({ name: 'fromStatusId' })
    fromStatus: TicketStatus;

    @Column()
    title: string;

    @Column({ nullable: true })
    toStatusId: number;

    @ManyToOne(() => TicketStatus, { nullable: true })
    @JoinColumn({ name: 'toStatusId' })
    toStatus: TicketStatus;
}
