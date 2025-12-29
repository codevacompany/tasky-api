import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTicketStatsEntity1766703386491 implements MigrationInterface {
    name = 'UpdateTicketStatsEntity1766703386491';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_nameSearchTokens"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tenant_emailHash"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tenant_cnpjHash"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "rejectedAt" TIMESTAMP`);
        await queryRunner.query(
            `CREATE VIEW "ticket_stats" AS SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."currentTargetUserId" AS "currentTargetUserId", "ticket"."reviewerId" AS "reviewerId", "ticket"."acceptedAt" AS "acceptedAt", "ticket"."dueAt" AS "dueAt", "ticket"."completedAt" AS "completedAt", "ticket"."rejectedAt" AS "rejectedAt", "reviewer"."departmentId" AS "reviewerDepartmentId", ARRAY_AGG(DISTINCT "targetUser"."departmentId") FILTER (WHERE "targetUser"."departmentId" IS NOT NULL) AS "departmentIds", CASE WHEN "ticket"."completedAt" IS NOT NULL THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."rejectedAt" IS NOT NULL THEN true ELSE false END AS "isRejected", CASE WHEN "ticket"."canceledAt" IS NOT NULL THEN true ELSE false END AS "isCanceled", CASE WHEN "ticket"."completedAt" IS NOT NULL OR "ticket"."rejectedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM (COALESCE("ticket"."completedAt", "ticket"."rejectedAt") - "ticket"."createdAt")) ELSE NULL END AS "totalTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds", ARRAY_AGG("tu"."userId" ORDER BY "tu"."order") AS "targetUserIds" FROM "ticket" "ticket" LEFT JOIN "ticket_target_user" "tu" ON "tu"."ticketId" = "ticket"."id"  LEFT JOIN "user" "targetUser" ON "targetUser"."id" = "tu"."userId"  LEFT JOIN "user" "reviewer" ON "reviewer"."id" = "ticket"."reviewerId" GROUP BY "ticket"."id", "ticket"."createdAt", "ticket"."updatedAt", "ticket"."tenantId", "ticket"."currentTargetUserId", "ticket"."completedAt", "ticket"."acceptedAt", "ticket"."canceledAt", "ticket"."rejectedAt", "ticket"."dueAt", "ticket"."reviewerId", "reviewer"."departmentId"`,
        );
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'ticket_stats',
                'SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."currentTargetUserId" AS "currentTargetUserId", "ticket"."reviewerId" AS "reviewerId", "ticket"."acceptedAt" AS "acceptedAt", "ticket"."dueAt" AS "dueAt", "ticket"."completedAt" AS "completedAt", "ticket"."rejectedAt" AS "rejectedAt", "reviewer"."departmentId" AS "reviewerDepartmentId", ARRAY_AGG(DISTINCT "targetUser"."departmentId") FILTER (WHERE "targetUser"."departmentId" IS NOT NULL) AS "departmentIds", CASE WHEN "ticket"."completedAt" IS NOT NULL THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."rejectedAt" IS NOT NULL THEN true ELSE false END AS "isRejected", CASE WHEN "ticket"."canceledAt" IS NOT NULL THEN true ELSE false END AS "isCanceled", CASE WHEN "ticket"."completedAt" IS NOT NULL OR "ticket"."rejectedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM (COALESCE("ticket"."completedAt", "ticket"."rejectedAt") - "ticket"."createdAt")) ELSE NULL END AS "totalTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds", ARRAY_AGG("tu"."userId" ORDER BY "tu"."order") AS "targetUserIds" FROM "ticket" "ticket" LEFT JOIN "ticket_target_user" "tu" ON "tu"."ticketId" = "ticket"."id"  LEFT JOIN "user" "targetUser" ON "targetUser"."id" = "tu"."userId"  LEFT JOIN "user" "reviewer" ON "reviewer"."id" = "ticket"."reviewerId" GROUP BY "ticket"."id", "ticket"."createdAt", "ticket"."updatedAt", "ticket"."tenantId", "ticket"."currentTargetUserId", "ticket"."completedAt", "ticket"."acceptedAt", "ticket"."canceledAt", "ticket"."rejectedAt", "ticket"."dueAt", "ticket"."reviewerId", "reviewer"."departmentId"',
            ],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "rejectedAt"`);
        await queryRunner.query(`CREATE INDEX "IDX_tenant_cnpjHash" ON "tenant" ("cnpjHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_tenant_emailHash" ON "tenant" ("emailHash") `);
        await queryRunner.query(
            `CREATE INDEX "IDX_ticket_nameSearchTokens" ON "ticket" ("nameSearchTokens") `,
        );
        await queryRunner.query(
            `CREATE VIEW "ticket_stats" AS SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."currentTargetUserId" AS "currentTargetUserId", ARRAY_AGG(DISTINCT "targetUser"."departmentId") FILTER (WHERE "targetUser"."departmentId" IS NOT NULL) AS "departmentIds", CASE WHEN "ticketStatus"."key" = 'finalizado' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds", ARRAY_AGG("tu"."userId" ORDER BY "tu"."order") AS "targetUserIds" FROM "ticket" "ticket" LEFT JOIN "ticket_target_user" "tu" ON "tu"."ticketId" = "ticket"."id"  LEFT JOIN "user" "targetUser" ON "targetUser"."id" = "tu"."userId"  LEFT JOIN "ticket_status" "ticketStatus" ON "ticketStatus"."id" = "ticket"."statusId" GROUP BY "ticket"."id", "ticket"."createdAt", "ticket"."updatedAt", "ticket"."tenantId", "ticket"."currentTargetUserId", "ticket"."completedAt", "ticket"."acceptedAt", "ticketStatus"."key"`,
        );
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'ticket_stats',
                'SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."currentTargetUserId" AS "currentTargetUserId", ARRAY_AGG(DISTINCT "targetUser"."departmentId") FILTER (WHERE "targetUser"."departmentId" IS NOT NULL) AS "departmentIds", CASE WHEN "ticketStatus"."key" = \'finalizado\' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds", ARRAY_AGG("tu"."userId" ORDER BY "tu"."order") AS "targetUserIds" FROM "ticket" "ticket" LEFT JOIN "ticket_target_user" "tu" ON "tu"."ticketId" = "ticket"."id"  LEFT JOIN "user" "targetUser" ON "targetUser"."id" = "tu"."userId"  LEFT JOIN "ticket_status" "ticketStatus" ON "ticketStatus"."id" = "ticket"."statusId" GROUP BY "ticket"."id", "ticket"."createdAt", "ticket"."updatedAt", "ticket"."tenantId", "ticket"."currentTargetUserId", "ticket"."completedAt", "ticket"."acceptedAt", "ticketStatus"."key"',
            ],
        );
    }
}
