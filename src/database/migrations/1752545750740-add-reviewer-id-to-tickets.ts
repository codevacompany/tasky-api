import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewerIdToTickets1752545750740 implements MigrationInterface {
    name = 'AddReviewerIdToTickets1752545750740'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" ADD "reviewerId" integer`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_e8264dd8607659c7308738bfaeb" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_e8264dd8607659c7308738bfaeb"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "reviewerId"`);
    }

}
