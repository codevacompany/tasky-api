import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';

export enum RoleName {
    GlobalAdmin = 'Administrador Global',
    TenantAdmin = 'Administrador',
    Supervisor = 'Supervisor',
    User = 'Usuário',
}

@Entity()
export class Role extends IdTimestampBaseEntity {
    @Column({ unique: true })
    name: string;
}
