import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingUniqueConstraints1751727465032 implements MigrationInterface {
    name = 'AddMissingUniqueConstraints1751727465032'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "department" ADD CONSTRAINT "UQ_e58e500747caf6053616faaf378" UNIQUE ("name", "tenantId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "department" DROP CONSTRAINT "UQ_e58e500747caf6053616faaf378"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22"`);
    }

}
