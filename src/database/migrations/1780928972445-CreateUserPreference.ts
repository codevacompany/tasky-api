import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserPreference1780928972445 implements MigrationInterface {
    name = 'CreateUserPreference1780928972445';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_preference" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" integer NOT NULL,
                "tenantId" integer NOT NULL,
                "notifications" jsonb NOT NULL,
                CONSTRAINT "PK_user_preference_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_preference_userId" UNIQUE ("userId"),
                CONSTRAINT "FK_user_preference_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(
            `CREATE INDEX "IDX_user_preference_tenantId" ON "user_preference" ("tenantId")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_user_preference_tenantId"`);
        await queryRunner.query(`DROP TABLE "user_preference"`);
    }
}
