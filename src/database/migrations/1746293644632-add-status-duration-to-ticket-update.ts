import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusDurationToTicketUpdate1746293644632 implements MigrationInterface {
    name = 'AddStatusDurationToTicketUpdate1746293644632'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "timeSecondsInLastStatus" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "timeSecondsInLastStatus"`);
    }

}
