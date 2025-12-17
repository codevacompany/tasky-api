import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoginCountAndLastLoginToUser1765984938325 implements MigrationInterface {
    name = 'AddLoginCountAndLastLoginToUser1765984938325';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "loginCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user" ADD "lastLogin" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastLogin"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "loginCount"`);
    }
}
