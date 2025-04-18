import { Column } from "typeorm";
import { IdTimestampBaseEntity } from "./id-timestamp.base-entity";

export abstract class TenantBoundBaseEntity extends IdTimestampBaseEntity {
    @Column({nullable: true})
    createdById: number;

    @Column()
    tenantId: number;

    @Column({nullable: true})
    updatedById: number;
}
