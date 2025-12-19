import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { encryptedTransformer } from '../../../shared/decorators/encrypted-column.decorator';

@Entity()
export class Tenant extends IdTimestampBaseEntity {
    @Column()
    name: string;

    @Column({ default: '', transformer: encryptedTransformer })
    email: string;

    @Column({ nullable: true })
    emailHash: string;

    @Column({ nullable: true, transformer: encryptedTransformer })
    phoneNumber: string;

    @Column({ unique: true })
    customKey: string;

    @Column({ nullable: true, transformer: encryptedTransformer })
    cnpj: string;

    @Column({ nullable: true })
    cnpjHash: string;

    @Column({ default: false })
    isInternal: boolean;

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

    @Column({ length: 255, nullable: true })
    stripeCustomerId: string;
}
