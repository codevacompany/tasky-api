import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteChecklistTable1764683188717 implements MigrationInterface {
    name = 'DeleteChecklistTable1764683188717';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" DROP CONSTRAINT "FK_5b0ec21f36dcb2683a930a9ea1a"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" RENAME COLUMN "checklistId" TO "ticketId"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" ADD CONSTRAINT "FK_dc0bf46c376724696da7ef79dc6" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        await queryRunner.query(`DROP TABLE "ticket_checklist"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "ticket_checklist" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "title" character varying NOT NULL, "ticketId" integer NOT NULL, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_644677a2dc65415667695132432" UNIQUE ("uuid"), CONSTRAINT "PK_08b2d95775ed99e401a8a0b8b6a" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_644677a2dc6541566769513243" ON "ticket_checklist" ("uuid") `,
        );

        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" DROP CONSTRAINT "FK_dc0bf46c376724696da7ef79dc6"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" RENAME COLUMN "ticketId" TO "checklistId"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" ADD CONSTRAINT "FK_5b0ec21f36dcb2683a930a9ea1a" FOREIGN KEY ("checklistId") REFERENCES "ticket_checklist"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }
}
