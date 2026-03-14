import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletedOnboardingToUser1771692320367 implements MigrationInterface {
    name = 'AddCompletedOnboardingToUser1771692320367';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "user" ADD "completedOnboarding" boolean NOT NULL DEFAULT false`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "completedOnboarding"`);
    }
}
