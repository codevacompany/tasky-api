import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSizeToTicketFile1767896903036 implements MigrationInterface {
    name = 'AddSizeToTicketFile1767896903036';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_file" ADD "size" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_b838c801ad1bc30478b590f2c92" FOREIGN KEY ("fromDepartmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_166d7340ffee420dfcab9555a09" FOREIGN KEY ("toDepartmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_166d7340ffee420dfcab9555a09"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_b838c801ad1bc30478b590f2c92"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_file" DROP COLUMN "size"`);
    }
}
