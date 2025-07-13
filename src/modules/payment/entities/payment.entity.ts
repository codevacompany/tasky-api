import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { TenantSubscription } from '../../tenant-subscription/entities/tenant-subscription.entity';

export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
}

export enum PaymentMethod {
    CREDIT_CARD = 'credit_card',
}

@Entity()
export class Payment extends TenantBoundBaseEntity {
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'timestamp' })
    dueDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        nullable: true,
    })
    method: PaymentMethod;

    @Column({ nullable: true })
    externalTransactionId: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    invoiceUrl: string;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    @Column()
    tenantSubscriptionId: number;

    @ManyToOne(() => Tenant)
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @ManyToOne(() => TenantSubscription, (ts) => ts.payments)
    @JoinColumn({ name: 'tenantSubscriptionId' })
    tenantSubscription: TenantSubscription;
}
