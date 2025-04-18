import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTicketUpdate1744567862981 implements MigrationInterface {
    name = 'CreateTicketUpdate1744567862981'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_75d1f67d31182f204e5c246e59d"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_40e4144132be73232ff19eb6e3e"`);
        await queryRunner.query(`ALTER TABLE "category" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "category" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "department" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "department" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "ticket" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "ticket" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "verification_code" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "verification_code" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "notification" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "notification" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "comment"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "performedById" integer NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_action_enum" AS ENUM('criação', 'mudança_de_status', 'finalização', 'atualização', 'cancelamento')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "action" "public"."ticket_update_action_enum" NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_fromstatus_enum" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'Em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "fromStatus" "public"."ticket_update_fromstatus_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_tostatus_enum" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'Em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "toStatus" "public"."ticket_update_tostatus_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "description" text`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_priority_enum" RENAME TO "ticket_priority_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_priority_enum" AS ENUM('baixa', 'média', 'alta')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "priority" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "priority" TYPE "public"."ticket_priority_enum" USING "priority"::"text"::"public"."ticket_priority_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "priority" SET DEFAULT 'média'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_priority_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_status_enum" RENAME TO "ticket_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'Em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" TYPE "public"."ticket_status_enum" USING "status"::"text"::"public"."ticket_status_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'pendente'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum" RENAME TO "notification_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('abertura', 'comentário', 'atualização_de_status', 'atualização', 'cancelamento')`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum" USING "type"::"text"::"public"."notification_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_40e4144132be73232ff19eb6e3e" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_dae430f094c33e5fc452ea22ff2" FOREIGN KEY ("performedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_dae430f094c33e5fc452ea22ff2"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_40e4144132be73232ff19eb6e3e"`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum_old" AS ENUM('Abertura', 'Comentário', 'Atualização de Status')`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum_old" USING "type"::text::"public"."notification_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum_old" RENAME TO "notification_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum_old" AS ENUM('Pendente', 'Em andamento', 'Aguardando verificação', 'Em verificação', 'Finalizado', 'Devolvido', 'Reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" TYPE "public"."ticket_status_enum_old" USING "status"::text::"public"."ticket_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'Pendente'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_status_enum_old" RENAME TO "ticket_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_priority_enum_old" AS ENUM('Baixa', 'Média', 'Alta')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "priority" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "priority" TYPE "public"."ticket_priority_enum_old" USING "priority"::text::"public"."ticket_priority_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "priority" SET DEFAULT 'Média'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_priority_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_priority_enum_old" RENAME TO "ticket_priority_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "toStatus"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_tostatus_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "fromStatus"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_fromstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "action"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_action_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "performedById"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" RENAME COLUMN "updatedAt" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "ticket" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "ticket" RENAME COLUMN "updatedAt" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" RENAME COLUMN "updatedAt" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "department" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "department" RENAME COLUMN "updatedAt" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "category" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "category" RENAME COLUMN "updatedAt" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "verification_code" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "verification_code" RENAME COLUMN "updatedAt" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "notification" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "notification" RENAME COLUMN "updatedAt" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "comment" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "userId" integer`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_40e4144132be73232ff19eb6e3e" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_75d1f67d31182f204e5c246e59d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
