import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

export enum CancellationReason {
    ChangedPriorities = 'mudança_de_prioridades',
    LackOfResources = 'falta_de_recursos',
    ProcessChange = 'mudança_no_processo',
    PersonalUnexpected = 'imprevisto_pessoal',
    RedundantTask = 'tarefa_redundante',
    StrategyChange = 'mudança_na_estratégia',
    ResponsibleAbsence = 'ausência_de_responsável',
    CostReassessment = 'reavaliação_de_custos',
    PlanningError = 'erro_de_planejamento',
    TechnicalIssues = 'problemas_técnicos',
    Other = 'outro',
}

@Entity()
export class TicketCancellationReason extends TenantBoundBaseEntity {
    @Column()
    ticketId: number;

    @OneToOne(() => Ticket)
    @JoinColumn({ name: 'ticketId' })
    ticket: Ticket;

    @Column()
    ticketCustomId: string;

    @Column()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({
        type: 'enum',
        enum: CancellationReason,
    })
    reason: CancellationReason;

    @Column('text')
    details: string;
}
