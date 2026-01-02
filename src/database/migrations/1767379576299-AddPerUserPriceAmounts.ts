import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerUserPriceAmounts1767379576299 implements MigrationInterface {
    name = 'AddPerUserPriceAmounts1767379576299';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" ADD "pricePerUserMonthly" numeric(10,2)`,
        );
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" ADD "pricePerUserYearly" numeric(10,2)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription_plan" DROP COLUMN "pricePerUserYearly"`);
        await queryRunner.query(
            `ALTER TABLE "subscription_plan" DROP COLUMN "pricePerUserMonthly"`,
        );
    }
}
