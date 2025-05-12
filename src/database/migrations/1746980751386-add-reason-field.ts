import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReasonField1746980751386 implements MigrationInterface {
    name = 'AddReasonField1746980751386'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "correction_request" DROP COLUMN "content"`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" DROP COLUMN "content"`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP COLUMN "content"`);
        await queryRunner.query(`CREATE TYPE "public"."correction_request_reason_enum" AS ENUM('erros_de_análise', 'falta_de_detalhamento', 'resultados_incompletos', 'erro_de_interpretação', 'problemas_de_qualidade', 'não_consideração_de_feedback_anterior', 'não_execução_de_testes_necessários', 'falhas_na_integração_de_dados_ou_sistemas', 'não_conformidade_com_requisitos', 'problema_com_a_documentação_de_suporte', 'falta_de_avaliação_de_riscos', 'outro')`);
        await queryRunner.query(`ALTER TABLE "correction_request" ADD "reason" "public"."correction_request_reason_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "correction_request" ADD "details" text NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_cancellation_reason_reason_enum" AS ENUM('mudança_de_prioridades', 'falta_de_recursos', 'mudança_no_processo', 'imprevisto_pessoal', 'tarefa_redundante', 'mudança_na_estratégia', 'ausência_de_responsável', 'reavaliação_de_custos', 'erro_de_planejamento', 'problemas_técnicos', 'outro')`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" ADD "reason" "public"."ticket_cancellation_reason_reason_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" ADD "details" text NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_disapproval_reason_reason_enum" AS ENUM('erros_de_qualidade', 'problemas_de_compreensão', 'falha_na_acompanhamento_de_processos', 'não_atende_aos_requisitos', 'prazo_não_cumprido', 'erro_de_execução_ou_implementação', 'não_consideração_de_feedbacks', 'tarefa_com_inconsistências', 'erro_de_comunicação', 'inadequação_de_ferramentas', 'falta_de_recursos', 'falta_de_conhecimento_ou_habilidade', 'outro')`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" ADD "reason" "public"."ticket_disapproval_reason_reason_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" ADD "details" text NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP COLUMN "details"`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP COLUMN "reason"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_disapproval_reason_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" DROP COLUMN "details"`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" DROP COLUMN "reason"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_cancellation_reason_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "correction_request" DROP COLUMN "details"`);
        await queryRunner.query(`ALTER TABLE "correction_request" DROP COLUMN "reason"`);
        await queryRunner.query(`DROP TYPE "public"."correction_request_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" ADD "content" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" ADD "content" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "correction_request" ADD "content" text NOT NULL`);
    }

}
