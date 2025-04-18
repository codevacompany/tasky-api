import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTicketStatus1744695767749 implements MigrationInterface {
    name = 'FixTicketStatus1744695767749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."ticket_update_fromstatus_enum" RENAME TO "ticket_update_fromstatus_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_fromstatus_enum" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "fromStatus" TYPE "public"."ticket_update_fromstatus_enum" USING "fromStatus"::"text"::"public"."ticket_update_fromstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_fromstatus_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_update_tostatus_enum" RENAME TO "ticket_update_tostatus_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_tostatus_enum" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "toStatus" TYPE "public"."ticket_update_tostatus_enum" USING "toStatus"::"text"::"public"."ticket_update_tostatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_tostatus_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_status_enum" RENAME TO "ticket_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" TYPE "public"."ticket_status_enum" USING "status"::"text"::"public"."ticket_status_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'pendente'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum_old" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'Em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" TYPE "public"."ticket_status_enum_old" USING "status"::"text"::"public"."ticket_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'pendente'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_status_enum_old" RENAME TO "ticket_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_tostatus_enum_old" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'Em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "toStatus" TYPE "public"."ticket_update_tostatus_enum_old" USING "toStatus"::"text"::"public"."ticket_update_tostatus_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_tostatus_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_update_tostatus_enum_old" RENAME TO "ticket_update_tostatus_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_fromstatus_enum_old" AS ENUM('pendente', 'em_andamento', 'aguardando_verificação', 'Em_verificação', 'finalizado', 'cancelado', 'devolvido', 'reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "fromStatus" TYPE "public"."ticket_update_fromstatus_enum_old" USING "fromStatus"::"text"::"public"."ticket_update_fromstatus_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_fromstatus_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_update_fromstatus_enum_old" RENAME TO "ticket_update_fromstatus_enum"`);
    }

}
