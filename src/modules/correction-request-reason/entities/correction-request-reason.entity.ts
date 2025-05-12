import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBoundBaseEntity } from '../../../shared/common/tenant-bound.base-entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { User } from '../../user/entities/user.entity';

export enum CorrectionReason {
    AnalysisErrors = 'erros_de_análise',
    LackOfDetail = 'falta_de_detalhamento',
    IncompleteResults = 'resultados_incompletos',
    InterpretationError = 'erro_de_interpretação',
    QualityProblems = 'problemas_de_qualidade',
    PreviousFeedbackNotConsidered = 'não_consideração_de_feedback_anterior',
    RequiredTestsNotPerformed = 'não_execução_de_testes_necessários',
    DataOrSystemsIntegrationFailures = 'falhas_na_integração_de_dados_ou_sistemas',
    NonComplianceWithRequirements = 'não_conformidade_com_requisitos',
    SupportDocumentationIssue = 'problema_com_a_documentação_de_suporte',
    LackOfRiskAssessment = 'falta_de_avaliação_de_riscos',
    Other = 'outro',
}

@Entity()
export class CorrectionRequest extends TenantBoundBaseEntity {
    @Column()
    ticketId: number;

    @ManyToOne(() => Ticket, (ticket) => ticket.correctionRequests)
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
        enum: CorrectionReason,
    })
    reason: CorrectionReason;

    @Column('text')
    details: string;
}
