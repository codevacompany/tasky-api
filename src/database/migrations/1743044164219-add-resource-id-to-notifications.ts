import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResourceIdToNotifications1743044164219 implements MigrationInterface {
    name = 'AddResourceIdToNotifications1743044164219'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" ADD "resourceId" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "resourceId"`);
    }

}
