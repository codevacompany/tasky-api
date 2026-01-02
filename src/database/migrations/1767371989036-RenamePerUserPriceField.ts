import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePerUserPriceField1767371989036 implements MigrationInterface {
    name = 'RenamePerUserPriceField1767371989036';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" RENAME COLUMN "stripePriceIdPerUser" TO "stripePriceIdPerUserMonthly"`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" ADD "stripePriceIdPerUserYearly" character varying(255)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" DROP COLUMN "stripePriceIdPerUserYearly"`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" RENAME COLUMN "stripePriceIdPerUserMonthly" TO "stripePriceIdPerUser"`,
        );
    }
}
