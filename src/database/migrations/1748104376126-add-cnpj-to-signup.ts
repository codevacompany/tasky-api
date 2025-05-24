import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCnpjToSignup1748104376126 implements MigrationInterface {
    name = 'AddCnpjToSignup1748104376126'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sign_up" ADD "cnpj" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sign_up" DROP COLUMN "cnpj"`);
    }

}
