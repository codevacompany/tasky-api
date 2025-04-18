import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';

@Entity()
export class Tenant extends IdTimestampBaseEntity {
    @Column()
    name: string;

    @Column()
    customKey: string;
}
