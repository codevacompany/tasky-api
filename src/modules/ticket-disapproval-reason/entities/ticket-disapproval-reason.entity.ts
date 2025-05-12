import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

export enum DisapprovalReason {
    QualityErrors = 'erros_de_qualidade',
    ComprehensionProblems = 'problemas_de_compreensão',
    ProcessFollowingFailure = 'falha_na_acompanhamento_de_processos',
    RequirementsNotMet = 'não_atende_aos_requisitos',
    DeadlineNotMet = 'prazo_não_cumprido',
    ExecutionOrImplementationError = 'erro_de_execução_ou_implementação',
    FeedbackNotConsidered = 'não_consideração_de_feedbacks',
    InconsistentTask = 'tarefa_com_inconsistências',
    CommunicationError = 'erro_de_comunicação',
    InadequateTools = 'inadequação_de_ferramentas',
    LackOfResources = 'falta_de_recursos',
    LackOfKnowledgeOrSkill = 'falta_de_conhecimento_ou_habilidade',
    Other = 'outro',
}

@Entity()
export class TicketDisapprovalReason extends TenantBoundBaseEntity {
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
        enum: DisapprovalReason,
    })
    reason: DisapprovalReason;

    @Column('text')
    details: string;
}
