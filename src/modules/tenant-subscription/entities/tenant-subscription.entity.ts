import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { SubscriptionPlan } from '../../subscription-plan/entities/subscription-plan.entity';
import { Payment } from '../../payment/entities/payment.entity';

export enum SubscriptionStatus {
    TRIAL = 'trial',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    CANCELLED = 'cancelled',
}

@Entity()
export class TenantSubscription extends TenantBoundBaseEntity {
    @Column({ type: 'timestamp' })
    startDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    endDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    trialEndDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    cancelledAt: Date;

    @Column({
        type: 'enum',
        enum: SubscriptionStatus,
        default: SubscriptionStatus.TRIAL,
    })
    status: SubscriptionStatus;

    @Column()
    subscriptionPlanId: number;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @ManyToOne(() => SubscriptionPlan, (sp) => sp.tenantSubscriptions)
    @JoinColumn({ name: 'subscriptionPlanId' })
    subscriptionPlan: SubscriptionPlan;

    @Column({ length: 255, nullable: true })
    stripeSubscriptionId: string;

    @Column({ length: 255, nullable: true })
    stripeSubscriptionItemIdBase: string;

    @Column({ length: 255, nullable: true })
    stripeSubscriptionItemIdPerUser: string;

    @OneToMany(() => Payment, (payment) => payment.tenantSubscription)
    payments: Payment[];

    isActive: boolean;

    @AfterLoad()
    calculateIsActive() {
        const now = new Date();

        if (this.cancelledAt) {
            this.isActive = false;
            return;
        }

        if (this.status === SubscriptionStatus.SUSPENDED) {
            this.isActive = false;
            return;
        }

        if (this.startDate > now) {
            this.isActive = false;
            return;
        }

        if (this.status === SubscriptionStatus.TRIAL && this.trialEndDate) {
            this.isActive = this.trialEndDate > now;
            return;
        }

        this.isActive = !this.endDate || this.endDate > now;
    }
}
