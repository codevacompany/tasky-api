import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintToRoleName1751727148459 implements MigrationInterface {
    name = 'AddUniqueConstraintToRoleName1751727148459'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "UQ_ae4578dcaed5adff96595e61660" UNIQUE ("name")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "UQ_ae4578dcaed5adff96595e61660"`);
    }

}
