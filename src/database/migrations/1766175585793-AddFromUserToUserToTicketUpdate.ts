import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFromUserToUserToTicketUpdate1766175585793 implements MigrationInterface {
    name = 'AddFromUserToUserToTicketUpdate1766175585793';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "fromUserId" integer`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD "toUserId" integer`);
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_2344089f0bcb7349e85de1e912b" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_dc0451615790d0b8b356379fb86" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_dc0451615790d0b8b356379fb86"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_2344089f0bcb7349e85de1e912b"`,
        );
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "toUserId"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP COLUMN "fromUserId"`);
    }
}
