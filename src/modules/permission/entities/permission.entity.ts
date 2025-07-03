import { Column, Entity, OneToMany } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { SubscriptionPlanPermission } from '../../subscription-plan/entities/subscription-plan-permission.entity';

@Entity()
export class Permission extends IdTimestampBaseEntity {
    @Column({ unique: true, length: 100 })
    key: string;

    @Column({ length: 200 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @OneToMany(() => SubscriptionPlanPermission, (spp) => spp.permission)
    subscriptionPlanPermissions: SubscriptionPlanPermission[];
}
