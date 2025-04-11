import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameTicketDateColumnsAndStatus1744332105754 implements MigrationInterface {
    name = 'RenameTicketDateColumnsAndStatus1744332105754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "completionDate"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "acceptanceDate"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "acceptedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "dueAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "completedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "isPrivate" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP CONSTRAINT "FK_3d08f54062e7f42b6ff1ca26b23"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_status_enum" RENAME TO "ticket_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum" AS ENUM('Pendente', 'Em andamento', 'Aguardando verificação', 'Em verificação', 'Finalizado', 'Devolvido', 'Reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" TYPE "public"."ticket_status_enum" USING "status"::"text"::"public"."ticket_status_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'Pendente'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum" RENAME TO "notification_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('Abertura', 'Comentário', 'Atualização de Status')`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum" USING "type"::"text"::"public"."notification_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD CONSTRAINT "FK_3d08f54062e7f42b6ff1ca26b23" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP CONSTRAINT "FK_3d08f54062e7f42b6ff1ca26b23"`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum_old" AS ENUM('Abertura', 'Comentário')`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum_old" USING "type"::"text"::"public"."notification_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum_old" RENAME TO "notification_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum_old" AS ENUM('Pendente', 'Em andamento', 'Aguardando verificação', 'Atrasado', 'Finalizado', 'Devolvido', 'Reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" TYPE "public"."ticket_status_enum_old" USING "status"::"text"::"public"."ticket_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'Pendente'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_status_enum_old" RENAME TO "ticket_status_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD CONSTRAINT "FK_3d08f54062e7f42b6ff1ca26b23" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "isPrivate"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "dueAt"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "acceptedAt"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "acceptanceDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "completionDate" TIMESTAMP`);
    }

}
