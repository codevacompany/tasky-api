import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSeenFeatureTip1788805891563 implements MigrationInterface {
    name = 'CreateUserSeenFeatureTip1788805891563';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_seen_feature_tip" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" integer NOT NULL,
                "tipId" character varying(128) NOT NULL,
                "seenAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_seen_feature_tip_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_seen_feature_tip_userId_tipId" UNIQUE ("userId", "tipId"),
                CONSTRAINT "FK_user_seen_feature_tip_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(
            `CREATE INDEX "IDX_user_seen_feature_tip_userId" ON "user_seen_feature_tip" ("userId")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_user_seen_feature_tip_userId"`);
        await queryRunner.query(`DROP TABLE "user_seen_feature_tip"`);
    }
}
