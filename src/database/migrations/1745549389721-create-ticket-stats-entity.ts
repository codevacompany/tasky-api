import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTicketStatsEntity1745549389721 implements MigrationInterface {
    name = 'CreateTicketStatsEntity1745549389721'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ticket_stats" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "ticketId" integer NOT NULL, "departmentId" integer NOT NULL, "isResolved" boolean NOT NULL DEFAULT false, "resolutionTimeSeconds" integer, "acceptanceTimeSeconds" integer, CONSTRAINT "PK_956e6ebd22fe92f5190d09ff8be" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ticket_stats" ADD CONSTRAINT "FK_4f5a51a36d1c453bc8ca28dd349" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_stats" ADD CONSTRAINT "FK_a1a0f6f1d7c550147e9b9a2f192" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_stats" DROP CONSTRAINT "FK_a1a0f6f1d7c550147e9b9a2f192"`);
        await queryRunner.query(`ALTER TABLE "ticket_stats" DROP CONSTRAINT "FK_4f5a51a36d1c453bc8ca28dd349"`);
        await queryRunner.query(`DROP TABLE "ticket_stats"`);
    }

}
