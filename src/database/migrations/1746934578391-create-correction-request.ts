import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCorrectionRequest1746934578391 implements MigrationInterface {
    name = 'CreateCorrectionRequest1746934578391'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "correction_request" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "ticketId" integer NOT NULL, "ticketCustomId" character varying NOT NULL, "userId" integer NOT NULL, "content" text NOT NULL, CONSTRAINT "PK_f27fae3589d868eb5ebd6f6425d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ticket_cancellation_reason" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "ticketId" integer NOT NULL, "ticketCustomId" character varying NOT NULL, "userId" integer NOT NULL, "content" text NOT NULL, CONSTRAINT "REL_6db80158f7db39a5084e57c37e" UNIQUE ("ticketId"), CONSTRAINT "PK_c9d2988cac307bcc3eca504c9a9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ticket_disapproval_reason" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "ticketId" integer NOT NULL, "ticketCustomId" character varying NOT NULL, "userId" integer NOT NULL, "content" text NOT NULL, CONSTRAINT "REL_41bde59991e76ec1bab159a5cc" UNIQUE ("ticketId"), CONSTRAINT "PK_b18203e146cad1e9f66892b8bcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum" RENAME TO "notification_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('abertura', 'comentário', 'atualização_de_status', 'atualização', 'cancelamento', 'reprovação', 'solicitação_de_correção')`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum" USING "type"::"text"::"public"."notification_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "correction_request" ADD CONSTRAINT "FK_5a1814b31d5c919bb1c1d0658ae" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "correction_request" ADD CONSTRAINT "FK_4dd0db304408be1e344a5a49595" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" ADD CONSTRAINT "FK_6db80158f7db39a5084e57c37e0" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" ADD CONSTRAINT "FK_be8998d35b9bbd0e83138705f93" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" ADD CONSTRAINT "FK_41bde59991e76ec1bab159a5cc0" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" ADD CONSTRAINT "FK_a3bf5e2bb25957fc455b2bf813c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP CONSTRAINT "FK_a3bf5e2bb25957fc455b2bf813c"`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP CONSTRAINT "FK_41bde59991e76ec1bab159a5cc0"`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" DROP CONSTRAINT "FK_be8998d35b9bbd0e83138705f93"`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" DROP CONSTRAINT "FK_6db80158f7db39a5084e57c37e0"`);
        await queryRunner.query(`ALTER TABLE "correction_request" DROP CONSTRAINT "FK_4dd0db304408be1e344a5a49595"`);
        await queryRunner.query(`ALTER TABLE "correction_request" DROP CONSTRAINT "FK_5a1814b31d5c919bb1c1d0658ae"`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum_old" AS ENUM('abertura', 'comentário', 'atualização_de_status', 'atualização', 'cancelamento')`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum_old" USING "type"::"text"::"public"."notification_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum_old" RENAME TO "notification_type_enum"`);
        await queryRunner.query(`DROP TABLE "ticket_disapproval_reason"`);
        await queryRunner.query(`DROP TABLE "ticket_cancellation_reason"`);
        await queryRunner.query(`DROP TABLE "correction_request"`);
    }

}
