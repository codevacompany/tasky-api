import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsInternalTenantColumn1744990023387 implements MigrationInterface {
    name = 'AddIsInternalTenantColumn1744990023387'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "isInternal"`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "isInternal" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "isInternal"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "isInternal" boolean NOT NULL DEFAULT false`);
    }

}
