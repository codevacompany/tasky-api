import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recreates indexes dropped by UpdateTicketStatsEntity (1766703386491) and never recreated.
 *
 * - nameSearchTokens: GIN index required for array overlap (&&) in ticket search (~25s without it)
 * - emailHash, cnpjHash: B-tree indexes for tenant lookup by email/CNPJ
 */
export class RecreateDroppedIndexes1770575112617 implements MigrationInterface {
    name = 'RecreateDroppedIndexes1770575112617';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ticket: GIN index for array overlap searches
        await queryRunner.query(
            `DROP INDEX IF EXISTS "public"."IDX_ticket_nameSearchTokens"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_ticket_nameSearchTokens" ON "ticket" USING GIN ("nameSearchTokens")`,
        );

        // Tenant: B-tree indexes for email/CNPJ lookups
        await queryRunner.query(
            `DROP INDEX IF EXISTS "public"."IDX_tenant_emailHash"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_tenant_emailHash" ON "tenant" ("emailHash")`,
        );

        await queryRunner.query(
            `DROP INDEX IF EXISTS "public"."IDX_tenant_cnpjHash"`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_tenant_cnpjHash" ON "tenant" ("cnpjHash")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX IF EXISTS "public"."IDX_ticket_nameSearchTokens"`,
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "public"."IDX_tenant_emailHash"`,
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "public"."IDX_tenant_cnpjHash"`,
        );
    }
}
