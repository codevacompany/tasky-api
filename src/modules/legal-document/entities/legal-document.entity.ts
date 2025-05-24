import { Column, Entity, Index } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';

export enum LegalDocumentType {
    TERMS_OF_SERVICE = 'terms_of_service',
    PRIVACY_POLICY = 'privacy_policy',
}

@Entity()
export class LegalDocument extends IdTimestampBaseEntity {
    @Column({
        type: 'enum',
        enum: LegalDocumentType,
    })
    @Index()
    type: LegalDocumentType;

    @Column()
    @Index()
    version: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ default: false })
    isActive: boolean;

    @Column({ nullable: true })
    effectiveDate: Date;

    @Column({ default: true })
    requiresExplicitConsent: boolean;
}
