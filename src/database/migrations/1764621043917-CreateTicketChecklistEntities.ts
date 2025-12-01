import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketChecklistEntities1764621043917 implements MigrationInterface {
    name = 'CreateTicketChecklistEntities1764621043917';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "ticket_checklist_item" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "title" character varying NOT NULL, "isCompleted" boolean NOT NULL DEFAULT false, "checklistId" integer NOT NULL, "assignedToId" integer, "dueDate" TIMESTAMP, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_47689f6596e500cc0c3c23416f9" UNIQUE ("uuid"), CONSTRAINT "PK_b487c51b65e9bbce7511238e2b0" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_47689f6596e500cc0c3c23416f" ON "ticket_checklist_item" ("uuid") `,
        );
        await queryRunner.query(
            `CREATE TABLE "ticket_checklist" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "title" character varying NOT NULL, "ticketId" integer NOT NULL, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_644677a2dc65415667695132432" UNIQUE ("uuid"), CONSTRAINT "PK_08b2d95775ed99e401a8a0b8b6a" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_644677a2dc6541566769513243" ON "ticket_checklist" ("uuid") `,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" ADD CONSTRAINT "FK_5b0ec21f36dcb2683a930a9ea1a" FOREIGN KEY ("checklistId") REFERENCES "ticket_checklist"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" ADD CONSTRAINT "FK_54723bdbf6e24f935871a407325" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist" ADD CONSTRAINT "FK_c32306721174f1656489e0f7b28" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist" DROP CONSTRAINT "FK_c32306721174f1656489e0f7b28"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" DROP CONSTRAINT "FK_54723bdbf6e24f935871a407325"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_checklist_item" DROP CONSTRAINT "FK_5b0ec21f36dcb2683a930a9ea1a"`,
        );
        await queryRunner.query(`DROP INDEX "public"."IDX_644677a2dc6541566769513243"`);
        await queryRunner.query(`DROP TABLE "ticket_checklist"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_47689f6596e500cc0c3c23416f"`);
        await queryRunner.query(`DROP TABLE "ticket_checklist_item"`);
    }
}
