import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTicketStatsView1746200000000 implements MigrationInterface {
    name = 'FixTicketStatsView1746200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the existing view
        await queryRunner.query(`DROP VIEW IF EXISTS "ticket_stats"`);

        // Delete the existing metadata entry
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );

        // Create the view with fixed NULL handling
        await queryRunner.query(
            `CREATE VIEW "ticket_stats" AS SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."departmentId" AS "departmentId", "ticket"."targetUserId" AS "targetUserId", CASE WHEN "ticket"."status" = 'finalizado' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds" FROM "ticket" "ticket"`,
        );

        // Add the new metadata entry
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'ticket_stats',
                'SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."departmentId" AS "departmentId", "ticket"."targetUserId" AS "targetUserId", CASE WHEN "ticket"."status" = \'finalizado\' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds" FROM "ticket" "ticket"',
            ],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the fixed view
        await queryRunner.query(`DROP VIEW IF EXISTS "ticket_stats"`);

        // Delete the new metadata entry
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );

        // Recreate the original view without NULL handling
        await queryRunner.query(
            `CREATE VIEW "ticket_stats" AS SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."departmentId" AS "departmentId", "ticket"."targetUserId" AS "targetUserId", CASE WHEN "ticket"."status" = 'finalizado' THEN true ELSE false END AS "isResolved", EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) AS "resolutionTimeSeconds", EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) AS "acceptanceTimeSeconds" FROM "ticket" "ticket"`,
        );

        // Add back the original metadata entry
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'ticket_stats',
                'SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."departmentId" AS "departmentId", "ticket"."targetUserId" AS "targetUserId", CASE WHEN "ticket"."status" = \'finalizado\' THEN true ELSE false END AS "isResolved", EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) AS "resolutionTimeSeconds", EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) AS "acceptanceTimeSeconds" FROM "ticket" "ticket"',
            ],
        );
    }
}
