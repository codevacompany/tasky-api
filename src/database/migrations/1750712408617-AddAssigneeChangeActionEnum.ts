import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAssigneeChangeActionEnum1750712408617 implements MigrationInterface {
    name = 'AddAssigneeChangeActionEnum1750712408617'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."ticket_update_action_enum" RENAME TO "ticket_update_action_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_action_enum" AS ENUM('criação', 'mudança_de_status', 'finalização', 'atualização', 'cancelamento', 'mudança_de_responsável')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "action" TYPE "public"."ticket_update_action_enum" USING "action"::"text"::"public"."ticket_update_action_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_action_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."ticket_update_action_enum_old" AS ENUM('criação', 'mudança_de_status', 'finalização', 'atualização', 'cancelamento')`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "action" TYPE "public"."ticket_update_action_enum_old" USING "action"::"text"::"public"."ticket_update_action_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_update_action_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ticket_update_action_enum_old" RENAME TO "ticket_update_action_enum"`);
    }

}
