import { Column, Entity, OneToMany } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { SubscriptionPlanPermission } from './subscription-plan-permission.entity';
import { TenantSubscription } from '../../tenant-subscription/entities/tenant-subscription.entity';

@Entity()
export class SubscriptionPlan extends IdTimestampBaseEntity {
    @Column({ length: 100 })
    name: string;

    @Column({ unique: true, length: 50 })
    slug: string;

    @Column({ nullable: true })
    maxUsers: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    priceMonthly: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    priceYearly: number;

    @Column({ length: 255, nullable: true })
    stripePriceIdMonthly: string;

    @Column({ length: 255, nullable: true })
    stripePriceIdYearly: string;

    @Column({ length: 255, nullable: true })
    stripePriceIdPerUser: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => SubscriptionPlanPermission, (spp) => spp.subscriptionPlan)
    subscriptionPlanPermissions: SubscriptionPlanPermission[];

    @OneToMany(() => TenantSubscription, (ts) => ts.subscriptionPlan)
    tenantSubscriptions: TenantSubscription[];
}
