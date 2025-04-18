import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketCustomIdOnOtherEntities1744861521803 implements MigrationInterface {
    name = 'AddTicketCustomIdOnOtherEntities1744861521803'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD "ticketCustomId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "ticketCustomId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "resourceCustomId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "resourceCustomId"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "ticketCustomId"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP COLUMN "ticketCustomId"`);
    }

}
