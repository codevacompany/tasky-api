import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeSignupStatusEnum1748116191176 implements MigrationInterface {
    name = 'ChangeSignupStatusEnum1748116191176'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sign_up" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."sign_up_status_enum" AS ENUM('pendente', 'aprovado', 'rejeitado', 'completo')`);
        await queryRunner.query(`ALTER TABLE "sign_up" ADD "status" "public"."sign_up_status_enum" NOT NULL DEFAULT 'pendente'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sign_up" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."sign_up_status_enum"`);
        await queryRunner.query(`ALTER TABLE "sign_up" ADD "status" character varying NOT NULL DEFAULT 'pending'`);
    }

}
