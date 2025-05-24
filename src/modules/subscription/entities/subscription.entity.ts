import { AfterLoad, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Tenant } from '../../tenant/entities/tenant.entity';

export enum SubscriptionType {
    TRIAL = 'trial',
    MONTHLY = 'mensal',
    YEARLY = 'anual',
}

@Entity()
export class Subscription extends TenantBoundBaseEntity {
    @Column({ type: 'timestamp' })
    startDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    endDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    canceledAt: Date;

    @Column({
        type: 'enum',
        enum: SubscriptionType,
        default: SubscriptionType.MONTHLY,
    })
    type: SubscriptionType;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    isActive: boolean;

    @AfterLoad()
    calculateIsActive() {
        const now = new Date();

        if (this.canceledAt) {
            this.isActive = false;
            return;
        }

        if (this.startDate > now) {
            this.isActive = false;
            return;
        }

        this.isActive = !this.endDate || this.endDate > now;
    }
}
