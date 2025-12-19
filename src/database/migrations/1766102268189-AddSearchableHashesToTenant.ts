import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSearchableHashesToTenant1766102268189 implements MigrationInterface {
    name = 'AddSearchableHashesToTenant1766102268189'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" ADD "emailHash" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "cnpjHash" character varying`);
        
        // Create indexes for faster searches
        await queryRunner.query(`CREATE INDEX "IDX_tenant_emailHash" ON "tenant" ("emailHash")`);
        await queryRunner.query(`CREATE INDEX "IDX_tenant_cnpjHash" ON "tenant" ("cnpjHash")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_tenant_cnpjHash"`);
        await queryRunner.query(`DROP INDEX "IDX_tenant_emailHash"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "cnpjHash"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "emailHash"`);
    }

}
