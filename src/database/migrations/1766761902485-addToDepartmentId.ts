import { MigrationInterface, QueryRunner } from "typeorm";

export class AddToDepartmentId1766761902485 implements MigrationInterface {
    name = 'AddToDepartmentId1766761902485'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "toDepartmentId" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "toDepartmentId"`);
    }

}
