import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { User } from '../../user/entities/user.entity';
import { TicketChecklist } from './ticket-checklist.entity';

@Entity()
export class TicketChecklistItem extends TenantBoundBaseEntity {
    @Column()
    title: string;

    @Column({ default: false })
    isCompleted: boolean;

    @ManyToOne(() => TicketChecklist, (checklist) => checklist.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'checklistId' })
    checklist: TicketChecklist;

    @Column()
    checklistId: number;

    @Column({ nullable: true })
    assignedToId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'assignedToId' })
    assignedTo: User;

    @Column('timestamp', { nullable: true })
    dueDate: Date | null;

    @Column({ default: 0 })
    order: number;
}
