import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { TicketStatus } from '../../ticket-status/entities/ticket-status.entity';

@Entity()
@Index(['tenantId', 'index'], { unique: true })
export class StatusColumn extends TenantBoundBaseEntity {
    @Column()
    name: string;

    @Column()
    index: number;

    @Column({ default: false })
    isDefault: boolean;

    @Column({ default: false })
    isDisableable: boolean;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => TicketStatus, (status) => status.statusColumn)
    statuses: TicketStatus[];
}
