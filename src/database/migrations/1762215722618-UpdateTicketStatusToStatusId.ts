import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTicketStatusToStatusId1762215722618 implements MigrationInterface {
    name = 'UpdateTicketStatusToStatusId1762215722618';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);
        await queryRunner.query(`ALTER TABLE "ticket" RENAME COLUMN "status" TO "statusId"`);
        await queryRunner.query(
            `ALTER TYPE "public"."ticket_status_enum" RENAME TO "ticket_statusid_enum"`,
        );
        await queryRunner.query(
            `CREATE TABLE "status_column" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "name" character varying NOT NULL, "index" integer NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "isDisableable" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_4323c274608b2aee86efc5e99a8" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_11e84f42894629dc6ece1beda1" ON "status_column" ("tenantId", "index") `,
        );
        await queryRunner.query(
            `CREATE TABLE "status_action" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "fromStatusId" integer NOT NULL, "title" character varying NOT NULL, "toStatusId" integer, CONSTRAINT "PK_7e26f03009b4864dd067e81db58" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_11d2bb69354a56f141bee7aefd" ON "status_action" ("tenantId", "fromStatusId", "toStatusId") `,
        );
        await queryRunner.query(
            `CREATE TABLE "ticket_status" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "key" character varying NOT NULL, "name" character varying NOT NULL, "statusColumnId" integer NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_a39055e902c270197f3711e0ee3" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_eaca9a6d6bb145a2ba77db5eb6" ON "ticket_status" ("tenantId", "key") `,
        );
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "statusId"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "statusId" integer NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE "status_action" ADD CONSTRAINT "FK_4a0b93df107a50c6faa561d45f7" FOREIGN KEY ("fromStatusId") REFERENCES "ticket_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "status_action" ADD CONSTRAINT "FK_7f0da1bd627c3ac91e6ae7a9444" FOREIGN KEY ("toStatusId") REFERENCES "ticket_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_status" ADD CONSTRAINT "FK_e3ca2df2d41b7310b706c45c418" FOREIGN KEY ("statusColumnId") REFERENCES "status_column"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket" ADD CONSTRAINT "FK_7312ac8aab89dd3586729d97ea0" FOREIGN KEY ("statusId") REFERENCES "ticket_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
        await queryRunner.query(
            `ALTER TABLE "ticket" DROP CONSTRAINT "FK_7312ac8aab89dd3586729d97ea0"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_status" DROP CONSTRAINT "FK_e3ca2df2d41b7310b706c45c418"`,
        );
        await queryRunner.query(
            `ALTER TABLE "status_action" DROP CONSTRAINT "FK_7f0da1bd627c3ac91e6ae7a9444"`,
        );
        await queryRunner.query(
            `ALTER TABLE "status_action" DROP CONSTRAINT "FK_4a0b93df107a50c6faa561d45f7"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "statusId"`);
        await queryRunner.query(
            `ALTER TABLE "ticket" ADD "statusId" "public"."ticket_statusid_enum" NOT NULL DEFAULT 'pendente'`,
        );
        await queryRunner.query(`DROP INDEX "public"."IDX_eaca9a6d6bb145a2ba77db5eb6"`);
        await queryRunner.query(`DROP TABLE "ticket_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11d2bb69354a56f141bee7aefd"`);
        await queryRunner.query(`DROP TABLE "status_action"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11e84f42894629dc6ece1beda1"`);
        await queryRunner.query(`DROP TABLE "status_column"`);
        await queryRunner.query(
            `ALTER TYPE "public"."ticket_statusid_enum" RENAME TO "ticket_status_enum"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket" RENAME COLUMN "statusId" TO "status"`);
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
}
