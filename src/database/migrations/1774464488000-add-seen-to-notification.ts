import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeenToNotification1774464488000 implements MigrationInterface {
    name = 'AddSeenToNotification1774464488000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" ADD "seen" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`UPDATE "notification" SET "seen" = true WHERE "read" = true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "seen"`);
    }
}
