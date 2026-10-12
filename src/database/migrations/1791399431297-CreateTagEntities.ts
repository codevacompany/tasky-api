import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTagEntities1791399431297 implements MigrationInterface {
    name = 'CreateTagEntities1791399431297';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "tag" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdById" integer,
                "tenantId" integer NOT NULL,
                "updatedById" integer,
                "name" character varying NOT NULL,
                "color" character varying(7) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                CONSTRAINT "UQ_tag_uuid" UNIQUE ("uuid"),
                CONSTRAINT "PK_tag_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_tag_tenant_name" ON "tag" ("tenantId", "name")`,
        );
        await queryRunner.query(`CREATE INDEX "IDX_tag_uuid" ON "tag" ("uuid")`);
        await queryRunner.query(`
            ALTER TABLE "tag"
            ADD CONSTRAINT "FK_tag_tenant"
            FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            CREATE TABLE "tag_suggested_for_department" (
                "tagId" integer NOT NULL,
                "departmentId" integer NOT NULL,
                CONSTRAINT "PK_tag_suggested_for_department" PRIMARY KEY ("tagId", "departmentId")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "tag_suggested_for_department"
            ADD CONSTRAINT "FK_tag_suggested_for_department_tag"
            FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "tag_suggested_for_department"
            ADD CONSTRAINT "FK_tag_suggested_for_department_department"
            FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            CREATE TABLE "ticket_tag" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdById" integer,
                "tenantId" integer NOT NULL,
                "updatedById" integer,
                "ticketId" integer NOT NULL,
                "tagId" integer NOT NULL,
                CONSTRAINT "UQ_ticket_tag_uuid" UNIQUE ("uuid"),
                CONSTRAINT "PK_ticket_tag_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_ticket_tag_ticket_tag" ON "ticket_tag" ("ticketId", "tagId")`,
        );
        await queryRunner.query(`CREATE INDEX "IDX_ticket_tag_uuid" ON "ticket_tag" ("uuid")`);
        await queryRunner.query(`
            ALTER TABLE "ticket_tag"
            ADD CONSTRAINT "FK_ticket_tag_tenant"
            FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ticket_tag"
            ADD CONSTRAINT "FK_ticket_tag_ticket"
            FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ticket_tag"
            ADD CONSTRAINT "FK_ticket_tag_tag"
            FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(
            `ALTER TYPE "public"."ticket_update_action_enum" RENAME TO "ticket_update_action_enum_old"`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."ticket_update_action_enum" AS ENUM('criação', 'mudança_de_status', 'finalização', 'atualização', 'cancelamento', 'mudança_de_responsável', 'remoção_de_responsável', 'adição_de_tag', 'remoção_de_tag')`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ALTER COLUMN "action" TYPE "public"."ticket_update_action_enum" USING "action"::"text"::"public"."ticket_update_action_enum"`,
        );
        await queryRunner.query(`DROP TYPE "public"."ticket_update_action_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."ticket_update_action_enum_old" AS ENUM('criação', 'mudança_de_status', 'finalização', 'atualização', 'cancelamento', 'mudança_de_responsável', 'remoção_de_responsável')`,
        );
        await queryRunner.query(
            `ALTER TABLE "ticket_update" ALTER COLUMN "action" TYPE "public"."ticket_update_action_enum_old" USING "action"::"text"::"public"."ticket_update_action_enum_old"`,
        );
        await queryRunner.query(`DROP TYPE "public"."ticket_update_action_enum"`);
        await queryRunner.query(
            `ALTER TYPE "public"."ticket_update_action_enum_old" RENAME TO "ticket_update_action_enum"`,
        );

        await queryRunner.query(`ALTER TABLE "ticket_tag" DROP CONSTRAINT "FK_ticket_tag_tag"`);
        await queryRunner.query(`ALTER TABLE "ticket_tag" DROP CONSTRAINT "FK_ticket_tag_ticket"`);
        await queryRunner.query(`ALTER TABLE "ticket_tag" DROP CONSTRAINT "FK_ticket_tag_tenant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_tag_uuid"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_tag_ticket_tag"`);
        await queryRunner.query(`DROP TABLE "ticket_tag"`);

        await queryRunner.query(
            `ALTER TABLE "tag_suggested_for_department" DROP CONSTRAINT "FK_tag_suggested_for_department_department"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tag_suggested_for_department" DROP CONSTRAINT "FK_tag_suggested_for_department_tag"`,
        );
        await queryRunner.query(`DROP TABLE "tag_suggested_for_department"`);

        await queryRunner.query(`ALTER TABLE "tag" DROP CONSTRAINT "FK_tag_tenant"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tag_uuid"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tag_tenant_name"`);
        await queryRunner.query(`DROP TABLE "tag"`);
    }
}
