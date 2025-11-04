import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { StatusColumn } from '../../status-column/entities/status-column.entity';
import { StatusAction } from '../../status-action/entities/status-action.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';

@Entity()
@Index(['tenantId', 'key'], { unique: true })
export class TicketStatus extends TenantBoundBaseEntity {
    @Column()
    key: string; // e.g., 'pendente', 'em_andamento', 'finalizado'

    @Column()
    name: string; // e.g., 'Pendente', 'Em andamento', 'Finalizado'

    @Column()
    statusColumnId: number;

    @ManyToOne(() => StatusColumn, (column) => column.statuses)
    @JoinColumn({ name: 'statusColumnId' })
    statusColumn: StatusColumn;

    @Column({ default: false })
    isDefault: boolean; // Default statuses keep existing logic

    @OneToMany(() => StatusAction, (action) => action.fromStatus)
    actions: StatusAction[];

    @OneToMany(() => Ticket, (ticket) => ticket.ticketStatus)
    tickets: Ticket[];
}
