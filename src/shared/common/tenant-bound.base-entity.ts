import { Column, ManyToOne, JoinColumn } from "typeorm";
import { IdTimestampBaseEntity } from "./id-timestamp.base-entity";
import { Tenant } from "../../modules/tenant/entities/tenant.entity";

export abstract class TenantBoundBaseEntity extends IdTimestampBaseEntity {
    @Column({nullable: true})
    createdById: number;

    @Column()
    tenantId: number;

    @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @Column({nullable: true})
    updatedById: number;
}
