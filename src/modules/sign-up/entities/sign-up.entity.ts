import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { encryptedTransformer } from '../../../shared/decorators/encrypted-column.decorator';

export enum SignUpStatus {
    PENDING = 'pendente',
    APPROVED = 'aprovado',
    REJECTED = 'rejeitado',
    COMPLETED = 'completo',
}

@Entity()
export class SignUp extends IdTimestampBaseEntity {
    @Column()
    companyName: string;

    @Column({ default: '' })
    email: string;

    @Column({ nullable: true, transformer: encryptedTransformer })
    cnpj: string;

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

    @Column({ transformer: encryptedTransformer })
    contactCpf: string;

    @Column()
    contactEmail: string;

    @Column()
    contactPhone: string;

    @Column({
        type: 'enum',
        enum: SignUpStatus,
        default: SignUpStatus.PENDING,
    })
    status: SignUpStatus;

    @Column({ nullable: true, transformer: encryptedTransformer })
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
