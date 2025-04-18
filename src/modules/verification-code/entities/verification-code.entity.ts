import { Column, Entity } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';

@Entity()
export class VerificationCode extends TenantBoundBaseEntity {
    @Column()
    code: string;

    @Column()
    email: string;

    @Column()
    expiresAt: Date;

    @Column({ default: false })
    isUsed: boolean;
}
