import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIncludedUsersToSubscriptionPlan1791783867183 implements MigrationInterface {
    name = 'AddIncludedUsersToSubscriptionPlan1791783867183';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription_plan" ADD "includedUsers" integer`);

        // Customizado: unlimited seats (maxUsers null) but base price includes 30 users.
        await queryRunner.query(
            `UPDATE "subscription_plan" SET "includedUsers" = 30 WHERE "slug" = 'customizado'`,
        );

        // Limited plans: included seats match the hard cap when not set.
        await queryRunner.query(
            `UPDATE "subscription_plan"
             SET "includedUsers" = "maxUsers"
             WHERE "includedUsers" IS NULL AND "maxUsers" IS NOT NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription_plan" DROP COLUMN "includedUsers"`);
    }
}
