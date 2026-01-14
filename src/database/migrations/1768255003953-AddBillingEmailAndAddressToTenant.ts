import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBillingEmailAndAddressToTenant1768255003953 implements MigrationInterface {
    name = 'AddBillingEmailAndAddressToTenant1768255003953'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" ADD "billingEmail" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "billingEmail"`);
    }

}
