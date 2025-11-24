import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataToComments1764000505175 implements MigrationInterface {
    name = 'AddMetadataToComments1764000505175';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "metadata" jsonb`);
        await queryRunner.query(`ALTER TABLE "verification_code" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "verification_code" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "category" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "category" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "department" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "department" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "role" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "correction_request" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "correction_request" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_cancellation_reason" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_cancellation_reason" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_comment" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket_comment" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_disapproval_reason" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_disapproval_reason" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_file" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket_file" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "status_column" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "status_column" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "status_action" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "status_action" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_status" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket_status" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_target_user" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_target_user" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "tenant" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "tenant" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "permission" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "permission" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan_permission" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan_permission" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "subscription_plan" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "payment" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_subscription" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_subscription" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "sign_up" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "sign_up" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "notification" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(`ALTER TABLE "legal_document" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "legal_document" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`,
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

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);
        await queryRunner.query(`ALTER TABLE "legal_document" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "legal_document" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "notification" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "sign_up" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "sign_up" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_subscription" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_subscription" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "payment" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "subscription_plan" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan_permission" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan_permission" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "permission" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "permission" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "tenant" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "tenant" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_target_user" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_target_user" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_status" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket_status" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "status_action" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "status_action" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "status_column" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "status_column" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_file" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket_file" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_disapproval_reason" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_disapproval_reason" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_comment" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "ticket_comment" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_cancellation_reason" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_cancellation_reason" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(
            `ALTER TABLE "correction_request" ALTER COLUMN "uuid" DROP DEFAULT`,
        );
        await queryRunner.query(
            `ALTER TABLE "correction_request" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "role" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "department" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "department" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "category" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "category" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "verification_code" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "verification_code" ALTER COLUMN "uuid" SET DEFAULT uuid_generate_v4()`,
        );
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "metadata"`);
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
