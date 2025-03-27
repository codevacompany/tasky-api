import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTargetUserToNotifications1743041311088 implements MigrationInterface {
    name = 'AddTargetUserToNotifications1743041311088'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" ADD "createdById" integer`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "targetUserId" integer NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_status_enum" RENAME TO "ticket_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum" AS ENUM('Pendente', 'Em andamento', 'Aguardando verificação', 'Atrasado', 'Finalizado', 'Devolvido', 'Reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" TYPE "public"."ticket_status_enum" USING "status"::"text"::"public"."ticket_status_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'Pendente'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_ab94760702f01d400c4e845fbe6" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_42071de20bb698f8b759c492ddd" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_42071de20bb698f8b759c492ddd"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_ab94760702f01d400c4e845fbe6"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_status_enum_old" AS ENUM('Pendente', 'Em andamento', 'Aguardando verificação', 'Finalizado', 'Devolvido', 'Reprovado')`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" TYPE "public"."ticket_status_enum_old" USING "status"::"text"::"public"."ticket_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'Pendente'`);
        await queryRunner.query(`DROP TYPE "public"."ticket_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_status_enum_old" RENAME TO "ticket_status_enum"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "targetUserId"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "createdById"`);
    }

}
