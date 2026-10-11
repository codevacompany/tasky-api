import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Department } from '../../department/entities/department.entity';
import { TicketTag } from './ticket-tag.entity';

@Entity()
@Index(['tenantId', 'name'], { unique: true })
export class Tag extends TenantBoundBaseEntity {
    @Column()
    name: string;

    @Column({ length: 7 })
    color: string;

    @Column({ default: true })
    isActive: boolean;

    /** Departments for which this tag is suggested in the picker (empty = company-wide). */
    @ManyToMany(() => Department)
    @JoinTable({
        name: 'tag_suggested_for_department',
        joinColumn: { name: 'tagId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'departmentId', referencedColumnName: 'id' },
    })
    suggestedForDepartments: Department[];

    @OneToMany(() => TicketTag, (ticketTag) => ticketTag.tag)
    ticketTags: TicketTag[];
}
