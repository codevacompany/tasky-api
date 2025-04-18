import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';

export enum RoleName {
    GlobalAdmin = 'Global Admin',
    TenantAdmin = 'Tenant Admin',
    User = 'User',
}

@Entity()
export class Role extends IdTimestampBaseEntity {
    @Column()
    name: string;
}
