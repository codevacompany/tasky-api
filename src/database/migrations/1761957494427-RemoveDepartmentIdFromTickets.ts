import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDepartmentIdFromTickets1761957494427 implements MigrationInterface {
    name = 'RemoveDepartmentIdFromTickets1761957494427';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);
        await queryRunner.query(
            `ALTER TABLE "ticket" DROP CONSTRAINT "FK_00aa98d082bd5c1121de4e4718d"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "departmentId"`);
        await queryRunner.query(
            `CREATE VIEW "ticket_stats" AS SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."currentTargetUserId" AS "currentTargetUserId", ARRAY_AGG(DISTINCT "targetUser"."departmentId") FILTER (WHERE "targetUser"."departmentId" IS NOT NULL) AS "departmentIds", CASE WHEN "ticket"."status" = 'finalizado' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds", ARRAY_AGG("tu"."userId" ORDER BY "tu"."order") AS "targetUserIds" FROM "ticket" "ticket" LEFT JOIN "ticket_target_user" "tu" ON "tu"."ticketId" = "ticket"."id" LEFT JOIN "user" "targetUser" ON "targetUser"."id" = "tu"."userId" GROUP BY "ticket"."id"`,
        );
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'ticket_stats',
                'SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."currentTargetUserId" AS "currentTargetUserId", ARRAY_AGG(DISTINCT "targetUser"."departmentId") FILTER (WHERE "targetUser"."departmentId" IS NOT NULL) AS "departmentIds", CASE WHEN "ticket"."status" = \'finalizado\' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds", ARRAY_AGG("tu"."userId" ORDER BY "tu"."order") AS "targetUserIds" FROM "ticket" "ticket" LEFT JOIN "ticket_target_user" "tu" ON "tu"."ticketId" = "ticket"."id" LEFT JOIN "user" "targetUser" ON "targetUser"."id" = "tu"."userId" GROUP BY "ticket"."id"',
            ],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "departmentId" integer NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE "ticket" ADD CONSTRAINT "FK_00aa98d082bd5c1121de4e4718d" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `CREATE VIEW "ticket_stats" AS SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."departmentId" AS "departmentId", "ticket"."currentTargetUserId" AS "currentTargetUserId", CASE WHEN "ticket"."status" = 'finalizado' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds", ARRAY_AGG("tu"."userId" ORDER BY "tu"."order") AS "targetUserIds" FROM "ticket" "ticket" LEFT JOIN "ticket_target_user" "tu" ON "tu"."ticketId" = "ticket"."id" GROUP BY "ticket"."id"`,
        );
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
            [
                'public',
                'VIEW',
                'ticket_stats',
                'SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."departmentId" AS "departmentId", "ticket"."currentTargetUserId" AS "currentTargetUserId", CASE WHEN "ticket"."status" = \'finalizado\' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds", ARRAY_AGG("tu"."userId" ORDER BY "tu"."order") AS "targetUserIds" FROM "ticket" "ticket" LEFT JOIN "ticket_target_user" "tu" ON "tu"."ticketId" = "ticket"."id" GROUP BY "ticket"."id"',
            ],
        );
    }
}
