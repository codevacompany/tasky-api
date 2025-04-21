import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTicketFileEntity1745167063769 implements MigrationInterface {
    name = 'CreateTicketFileEntity1745167063769'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "ticket_file" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "url" character varying NOT NULL, "name" character varying NOT NULL, "mimeType" character varying NOT NULL, "ticketId" integer NOT NULL, CONSTRAINT "PK_8dd271ff4f72045e5f3aead0d40" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ticket_file" ADD CONSTRAINT "FK_a6e80a953535bb19c1e7b9a91d7" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_file" DROP CONSTRAINT "FK_a6e80a953535bb19c1e7b9a91d7"`);
        await queryRunner.query(`DROP TABLE "ticket_file"`);
    }

}
