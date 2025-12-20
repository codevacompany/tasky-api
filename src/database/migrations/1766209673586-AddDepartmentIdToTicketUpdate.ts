import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentIdToTicketUpdate1766209673586 implements MigrationInterface {
    name = 'AddDepartmentIdToTicketUpdate1766209673586';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "fromDepartmentId" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "fromDepartmentId"`);
    }
}
