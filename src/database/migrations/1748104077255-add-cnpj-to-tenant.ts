import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCnpjToTenant1748104077255 implements MigrationInterface {
    name = 'AddCnpjToTenant1748104077255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" ADD "cnpj" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "cnpj"`);
    }

}
