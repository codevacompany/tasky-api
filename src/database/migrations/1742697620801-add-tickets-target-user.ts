import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketsTargetUser1742697620801 implements MigrationInterface {
    name = 'AddTicketsTargetUser1742697620801'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "dateTime"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "creationDate"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "disapprovalReason" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "disapprovalReason" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "creationDate" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "dateTime" TIMESTAMP NOT NULL`);
    }

}
