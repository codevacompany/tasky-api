import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTenant1744599038040 implements MigrationInterface {
    name = 'CreateTenant1744599038040'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tenant" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "customKey" character varying NOT NULL, CONSTRAINT "PK_da8c6efd67bb301e810e56ac139" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "category" ADD "createdById" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "category" ADD "tenantId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "category" ADD "updatedById" integer`);
        await queryRunner.query(`ALTER TABLE "user" ADD "createdById" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD "tenantId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD "updatedById" integer`);
        await queryRunner.query(`ALTER TABLE "department" ADD "createdById" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "department" ADD "tenantId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "department" ADD "updatedById" integer`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD "createdById" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD "tenantId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD "updatedById" integer`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "createdById" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "tenantId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "updatedById" integer`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "createdById" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "tenantId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "updatedById" integer`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "customId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "canceledAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "verification_code" ADD "createdById" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "verification_code" ADD "tenantId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "verification_code" ADD "updatedById" integer`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "tenantId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notification" ADD "updatedById" integer`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_ab94760702f01d400c4e845fbe6"`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_31a8cc51e06e84e27c49cd0e67" ON "ticket" ("tenantId", "customId") `);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_ab94760702f01d400c4e845fbe6" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_ab94760702f01d400c4e845fbe6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31a8cc51e06e84e27c49cd0e67"`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_ab94760702f01d400c4e845fbe6" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "verification_code" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "verification_code" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "verification_code" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "canceledAt"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "customId"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "department" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "createdById"`);
        await queryRunner.query(`DROP TABLE "tenant"`);
    }

}
