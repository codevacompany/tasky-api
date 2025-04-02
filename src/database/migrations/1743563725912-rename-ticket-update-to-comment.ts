import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameTicketUpdateToComment1743563725912 implements MigrationInterface {
    name = 'RenameTicketUpdateToComment1743563725912'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ticket_comment" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ticketId" integer NOT NULL, "content" text NOT NULL, "userId" integer, CONSTRAINT "PK_375385ad29b177463987f0a14a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "disapprovalReason"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD CONSTRAINT "FK_653665e6f8dd8c3d0d0f3a07598" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD CONSTRAINT "FK_3d08f54062e7f42b6ff1ca26b23" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP CONSTRAINT "FK_3d08f54062e7f42b6ff1ca26b23"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP CONSTRAINT "FK_653665e6f8dd8c3d0d0f3a07598"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "disapprovalReason" text`);
        await queryRunner.query(`DROP TABLE "ticket_comment"`);
    }

}
