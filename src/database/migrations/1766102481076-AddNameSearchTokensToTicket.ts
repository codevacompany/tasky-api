import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameSearchTokensToTicket1766102481076 implements MigrationInterface {
    name = 'AddNameSearchTokensToTicket1766102481076'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" ADD "nameSearchTokens" text array`);
        
        // Create GIN index for fast array searches
        await queryRunner.query(`CREATE INDEX "IDX_ticket_nameSearchTokens" ON "ticket" USING GIN ("nameSearchTokens")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_ticket_nameSearchTokens"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "nameSearchTokens"`);
    }

}
