import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSubscriptionEntity1748098998446 implements MigrationInterface {
    name = 'CreateSubscriptionEntity1748098998446'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."subscription_type_enum" AS ENUM('trial', 'mensal', 'anual')`);
        await queryRunner.query(`CREATE TABLE "subscription" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP, "canceledAt" TIMESTAMP, "type" "public"."subscription_type_enum" NOT NULL DEFAULT 'mensal', CONSTRAINT "PK_8c3e00ebd02103caa1174cd5d9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "subscription" ADD CONSTRAINT "FK_c86077795cb9a3ce80d19d670a5" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription" DROP CONSTRAINT "FK_c86077795cb9a3ce80d19d670a5"`);
        await queryRunner.query(`DROP TABLE "subscription"`);
        await queryRunner.query(`DROP TYPE "public"."subscription_type_enum"`);
    }

}
