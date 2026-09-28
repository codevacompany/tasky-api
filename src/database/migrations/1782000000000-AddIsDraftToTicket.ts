import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDraftToTicket1782000000000 implements MigrationInterface {
    name = 'AddIsDraftToTicket1782000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ticket" ADD "isDraft" boolean NOT NULL DEFAULT false`,
        );
        await queryRunner.query(`ALTER TABLE "ticket" ADD "publishedAt" TIMESTAMP`);
        await queryRunner.query(
            `UPDATE "ticket" SET "publishedAt" = "createdAt" WHERE "isDraft" = false`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "publishedAt"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "isDraft"`);
    }
}
