import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTicketStats1746155269893 implements MigrationInterface {
    name = 'UpdateTicketStats1746155269893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_stats" ADD "targetUserId" integer`);
        await queryRunner.query(`ALTER TABLE "ticket_stats" ADD CONSTRAINT "FK_a0cc063bb9832316a7a1d6c167f" FOREIGN KEY ("targetUserId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_stats" DROP CONSTRAINT "FK_a0cc063bb9832316a7a1d6c167f"`);
        await queryRunner.query(`ALTER TABLE "ticket_stats" DROP COLUMN "targetUserId"`);
    }

}
