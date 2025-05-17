import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';

export enum SignUpStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    COMPLETED = 'completed',
}

@Entity()
export class SignUp extends IdTimestampBaseEntity {
    @Column()
    companyName: string;

    @Column({ default: '' })
    email: string;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ nullable: true })
    cep: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    neighborhood: string;

    @Column({ nullable: true })
    street: string;

    @Column({ nullable: true })
    number: string;

    @Column({ nullable: true })
    complement: string;

    @Column({ nullable: true })
    companySize: string;

    @Column({ nullable: true })
    mainActivity: string;

    @Column()
    contactName: string;

    @Column()
    contactCpf: string;

    @Column()
    contactEmail: string;

    @Column()
    contactPhone: string;

    @Column({ default: 'pending' })
    status: string;

    @Column({ nullable: true })
    activationToken: string;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date;

    // Consent tracking fields
    @Column({ default: false })
    termsAccepted: boolean;

    @Column({ type: 'timestamp', nullable: true })
    termsAcceptedAt: Date;

    @Column({ nullable: true })
    termsVersion: string;

    @Column({ default: false })
    privacyPolicyAccepted: boolean;

    @Column({ type: 'timestamp', nullable: true })
    privacyPolicyAcceptedAt: Date;

    @Column({ nullable: true })
    privacyPolicyVersion: string;
}
