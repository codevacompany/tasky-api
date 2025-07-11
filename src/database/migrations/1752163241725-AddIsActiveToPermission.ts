import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToPermission1752163241725 implements MigrationInterface {
    name = 'AddIsActiveToPermission1752163241725'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permission" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permission" DROP COLUMN "isActive"`);
    }

}
