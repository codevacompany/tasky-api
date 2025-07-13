import { Entity, JoinColumn, ManyToOne, Unique, Column } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { Permission } from '../../permission/entities/permission.entity';

@Entity()
@Unique(['subscriptionPlanId', 'permissionId'])
export class SubscriptionPlanPermission extends IdTimestampBaseEntity {
    @Column()
    subscriptionPlanId: number;

    @Column()
    permissionId: number;

    @ManyToOne(() => SubscriptionPlan, (sp) => sp.subscriptionPlanPermissions, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'subscriptionPlanId' })
    subscriptionPlan: SubscriptionPlan;

    @ManyToOne(() => Permission, (p) => p.subscriptionPlanPermissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permissionId' })
    permission: Permission;
}
