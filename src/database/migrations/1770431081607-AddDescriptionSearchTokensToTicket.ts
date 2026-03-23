import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDescriptionSearchTokensToTicket1770431081607 implements MigrationInterface {
    name = 'AddDescriptionSearchTokensToTicket1770431081607'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the column
        await queryRunner.query(`ALTER TABLE "ticket" ADD "descriptionSearchTokens" text array`);

        // Create GIN index for fast array searches
        await queryRunner.query(`CREATE INDEX "IDX_ticket_descriptionSearchTokens" ON "ticket" USING GIN ("descriptionSearchTokens")`);
        // NOTE:
        // Token backfill is intentionally not done in this migration to avoid OOM on large datasets.
        // Backfill/regeneration is handled by the subsequent migration:
        // 1770577347350-RegenerateSearchTokensWithNewFormat
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_ticket_descriptionSearchTokens"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "descriptionSearchTokens"`);
    }

}
