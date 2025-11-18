import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUuidToTables1763431318072 implements MigrationInterface {
    name = 'AddUuidToTables1763431318072';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);
        await queryRunner.query(
            `ALTER TABLE "verification_code" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "verification_code" ADD CONSTRAINT "UQ_5342614d61333af21e5dda2b103" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "department" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "department" ADD CONSTRAINT "UQ_cf9e422063fd1b4a6b6a15c936f" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "category" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "category" ADD CONSTRAINT "UQ_86ee096735ccbfa3fd319af1833" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "correction_request" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "correction_request" ADD CONSTRAINT "UQ_f860960231d5a816219d95b48cf" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_cancellation_reason" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_cancellation_reason" ADD CONSTRAINT "UQ_798efb38fc4ca16329cc62c94d8" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_comment" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_comment" ADD CONSTRAINT "UQ_e3715f2cb708089cbecfac1b727" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_disapproval_reason" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_disapproval_reason" ADD CONSTRAINT "UQ_e66f045170a1c842c4764840c67" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_file" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_file" ADD CONSTRAINT "UQ_8f146eb3b7d6f888c34d5243ba3" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_target_user" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_target_user" ADD CONSTRAINT "UQ_76aaad40447577db23c18d689e3" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ADD CONSTRAINT "UQ_346d51d5f3bd82f4ab0850567a1" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "status_column" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "status_column" ADD CONSTRAINT "UQ_62a2825ef15cdda827aab72971a" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "status_action" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "status_action" ADD CONSTRAINT "UQ_412f74687568346deaa7e18ef83" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_status" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_status" ADD CONSTRAINT "UQ_5090e09c2964f803ef0ac4d072b" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket" ADD CONSTRAINT "UQ_01ce2c1bfa8d97403cfcb7e410a" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "role" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "role" ADD CONSTRAINT "UQ_16fc336b9576146aa1f03fdc7c5" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "user" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "user" ADD CONSTRAINT "UQ_a95e949168be7b7ece1a2382fed" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "permission" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "permission" ADD CONSTRAINT "UQ_972bbdc048bf5d859b99488607e" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan_permission" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan_permission" ADD CONSTRAINT "UQ_308e4840f862ff9e29028e63f58" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant" ADD CONSTRAINT "UQ_065d899dce9195dfb9d4e461a28" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "payment" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "payment" ADD CONSTRAINT "UQ_c386bf9fa50eeada75b7adcc647" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_subscription" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "tenant_subscription" ADD CONSTRAINT "UQ_cba057207bcce4590646547ecc5" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" ADD CONSTRAINT "UQ_f039af8acedb7f99582b0903034" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "sign_up" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "sign_up" ADD CONSTRAINT "UQ_5124457025d269e9e6ff63317ab" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "notification" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "notification" ADD CONSTRAINT "UQ_b9fa421f94f7707ba109bf73b82" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `ALTER TABLE "legal_document" ADD "uuid" uuid NOT NULL DEFAULT gen_random_uuid()`,
        );
        await queryRunner.query(
            `ALTER TABLE "legal_document" ADD CONSTRAINT "UQ_2a40c0f2eeff975cbbf0d4d2dcb" UNIQUE ("uuid")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_5342614d61333af21e5dda2b10" ON "verification_code" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_cf9e422063fd1b4a6b6a15c936" ON "department" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_86ee096735ccbfa3fd319af183" ON "category" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_f860960231d5a816219d95b48c" ON "correction_request" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_798efb38fc4ca16329cc62c94d" ON "ticket_cancellation_reason" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e3715f2cb708089cbecfac1b72" ON "ticket_comment" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_e66f045170a1c842c4764840c6" ON "ticket_disapproval_reason" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_8f146eb3b7d6f888c34d5243ba" ON "ticket_file" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_76aaad40447577db23c18d689e" ON "ticket_target_user" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_346d51d5f3bd82f4ab0850567a" ON "ticket_update" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_62a2825ef15cdda827aab72971" ON "status_column" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_412f74687568346deaa7e18ef8" ON "status_action" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_5090e09c2964f803ef0ac4d072" ON "ticket_status" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_01ce2c1bfa8d97403cfcb7e410" ON "ticket" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_16fc336b9576146aa1f03fdc7c" ON "role" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_a95e949168be7b7ece1a2382fe" ON "user" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_972bbdc048bf5d859b99488607" ON "permission" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_308e4840f862ff9e29028e63f5" ON "subscription_plan_permission" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_065d899dce9195dfb9d4e461a2" ON "tenant" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_c386bf9fa50eeada75b7adcc64" ON "payment" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_cba057207bcce4590646547ecc" ON "tenant_subscription" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_f039af8acedb7f99582b090303" ON "subscription_plan" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_5124457025d269e9e6ff63317a" ON "sign_up" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_b9fa421f94f7707ba109bf73b8" ON "notification" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_2a40c0f2eeff975cbbf0d4d2dc" ON "legal_document" ("uuid") `,
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
        await queryRunner.query(`DROP INDEX "public"."IDX_2a40c0f2eeff975cbbf0d4d2dc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b9fa421f94f7707ba109bf73b8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5124457025d269e9e6ff63317a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f039af8acedb7f99582b090303"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cba057207bcce4590646547ecc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c386bf9fa50eeada75b7adcc64"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_065d899dce9195dfb9d4e461a2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_308e4840f862ff9e29028e63f5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_972bbdc048bf5d859b99488607"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a95e949168be7b7ece1a2382fe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16fc336b9576146aa1f03fdc7c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01ce2c1bfa8d97403cfcb7e410"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5090e09c2964f803ef0ac4d072"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_412f74687568346deaa7e18ef8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_62a2825ef15cdda827aab72971"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_346d51d5f3bd82f4ab0850567a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76aaad40447577db23c18d689e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f146eb3b7d6f888c34d5243ba"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e66f045170a1c842c4764840c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3715f2cb708089cbecfac1b72"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_798efb38fc4ca16329cc62c94d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f860960231d5a816219d95b48c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_86ee096735ccbfa3fd319af183"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cf9e422063fd1b4a6b6a15c936"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5342614d61333af21e5dda2b10"`);
        await queryRunner.query(
            `ALTER TABLE "legal_document" DROP CONSTRAINT "UQ_2a40c0f2eeff975cbbf0d4d2dcb"`,
        );
        await queryRunner.query(`ALTER TABLE "legal_document" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "notification" DROP CONSTRAINT "UQ_b9fa421f94f7707ba109bf73b82"`,
        );
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "sign_up" DROP CONSTRAINT "UQ_5124457025d269e9e6ff63317ab"`,
        );
        await queryRunner.query(`ALTER TABLE "sign_up" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" DROP CONSTRAINT "UQ_f039af8acedb7f99582b0903034"`,
        );
        await queryRunner.query(`ALTER TABLE "subscription_plan" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "tenant_subscription" DROP CONSTRAINT "UQ_cba057207bcce4590646547ecc5"`,
        );
        await queryRunner.query(`ALTER TABLE "tenant_subscription" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "payment" DROP CONSTRAINT "UQ_c386bf9fa50eeada75b7adcc647"`,
        );
        await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "tenant" DROP CONSTRAINT "UQ_065d899dce9195dfb9d4e461a28"`,
        );
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "subscription_plan_permission" DROP CONSTRAINT "UQ_308e4840f862ff9e29028e63f58"`,
        );
        await queryRunner.query(`ALTER TABLE "subscription_plan_permission" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "permission" DROP CONSTRAINT "UQ_972bbdc048bf5d859b99488607e"`,
        );
        await queryRunner.query(`ALTER TABLE "permission" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "user" DROP CONSTRAINT "UQ_a95e949168be7b7ece1a2382fed"`,
        );
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "role" DROP CONSTRAINT "UQ_16fc336b9576146aa1f03fdc7c5"`,
        );
        await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "ticket" DROP CONSTRAINT "UQ_01ce2c1bfa8d97403cfcb7e410a"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "ticket_status" DROP CONSTRAINT "UQ_5090e09c2964f803ef0ac4d072b"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_status" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "status_action" DROP CONSTRAINT "UQ_412f74687568346deaa7e18ef83"`,
        );
        await queryRunner.query(`ALTER TABLE "status_action" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "status_column" DROP CONSTRAINT "UQ_62a2825ef15cdda827aab72971a"`,
        );
        await queryRunner.query(`ALTER TABLE "status_column" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "ticket_update" DROP CONSTRAINT "UQ_346d51d5f3bd82f4ab0850567a1"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "ticket_target_user" DROP CONSTRAINT "UQ_76aaad40447577db23c18d689e3"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_target_user" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "ticket_file" DROP CONSTRAINT "UQ_8f146eb3b7d6f888c34d5243ba3"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_file" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "ticket_disapproval_reason" DROP CONSTRAINT "UQ_e66f045170a1c842c4764840c67"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "ticket_comment" DROP CONSTRAINT "UQ_e3715f2cb708089cbecfac1b727"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "ticket_cancellation_reason" DROP CONSTRAINT "UQ_798efb38fc4ca16329cc62c94d8"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "correction_request" DROP CONSTRAINT "UQ_f860960231d5a816219d95b48cf"`,
        );
        await queryRunner.query(`ALTER TABLE "correction_request" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "category" DROP CONSTRAINT "UQ_86ee096735ccbfa3fd319af1833"`,
        );
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "department" DROP CONSTRAINT "UQ_cf9e422063fd1b4a6b6a15c936f"`,
        );
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "uuid"`);
        await queryRunner.query(
            `ALTER TABLE "verification_code" DROP CONSTRAINT "UQ_5342614d61333af21e5dda2b103"`,
        );
        await queryRunner.query(`ALTER TABLE "verification_code" DROP COLUMN "uuid"`);
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
