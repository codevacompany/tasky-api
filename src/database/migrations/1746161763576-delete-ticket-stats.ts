import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteTicketStats1746161763576 implements MigrationInterface {
    name = 'DeleteTicketStats1746161763576';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop constraints before dropping the table
        await queryRunner.query(
            `ALTER TABLE "ticket_stats" DROP CONSTRAINT IF EXISTS "FK_4b5467a2b65bab1cc503f6d7a9a"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_stats" DROP CONSTRAINT IF EXISTS "FK_c2fb34b4bd897a8a5a99f4d3a6d"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_stats" DROP CONSTRAINT IF EXISTS "FK_c2fb34b4bd897a8a5a99f4d3a6e"`,
        );

        // Drop the old ticket_stats table
        await queryRunner.query(`DROP TABLE IF EXISTS "ticket_stats"`);

        // Create the view with fixed NULL handling
        await queryRunner.query(
            `CREATE VIEW "ticket_stats" AS SELECT "ticket"."id" AS "id", "ticket"."id" AS "ticketId", "ticket"."createdAt" AS "createdAt", "ticket"."updatedAt" AS "updatedAt", "ticket"."tenantId" AS "tenantId", "ticket"."departmentId" AS "departmentId", "ticket"."targetUserId" AS "targetUserId", CASE WHEN "ticket"."status" = 'finalizado' THEN true ELSE false END AS "isResolved", CASE WHEN "ticket"."completedAt" IS NOT NULL AND "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."completedAt" - "ticket"."acceptedAt")) ELSE NULL END AS "resolutionTimeSeconds", CASE WHEN "ticket"."acceptedAt" IS NOT NULL THEN EXTRACT(EPOCH FROM ("ticket"."acceptedAt" - "ticket"."createdAt")) ELSE NULL END AS "acceptanceTimeSeconds" FROM "ticket" "ticket"`,
        );
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
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
            ['VIEW', 'ticket_stats', 'public'],
        );
        await queryRunner.query(`DROP VIEW "ticket_stats"`);

        // Recreate the original table structure (this is approximate and might need adjustment)
        await queryRunner.query(
            `CREATE TABLE "ticket_stats" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" integer NOT NULL, "ticketId" integer NOT NULL, "departmentId" integer NOT NULL, "targetUserId" integer, "isResolved" boolean NOT NULL DEFAULT false, "resolutionTimeSeconds" integer, "acceptanceTimeSeconds" integer, CONSTRAINT "PK_ticket_stats_id" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_stats" ADD CONSTRAINT "FK_4b5467a2b65bab1cc503f6d7a9a" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_stats" ADD CONSTRAINT "FK_c2fb34b4bd897a8a5a99f4d3a6d" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }
}
