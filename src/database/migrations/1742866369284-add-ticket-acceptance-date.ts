import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketAcceptanceDate1742866369284 implements MigrationInterface {
    name = 'AddTicketAcceptanceDate1742866369284'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" ADD "acceptanceDate" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "acceptanceDate"`);
    }

}
