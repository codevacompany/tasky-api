import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintToTenantCustomKey1751727022841 implements MigrationInterface {
    name = 'AddUniqueConstraintToTenantCustomKey1751727022841'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permission" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "permission" DROP COLUMN "category"`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" DROP COLUMN "currentUsers"`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD CONSTRAINT "UQ_c33c1f2a1198fe31e1f3e1e674a" UNIQUE ("customKey")`);
        await queryRunner.query(`ALTER TYPE "public"."payment_method_enum" RENAME TO "payment_method_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payment_method_enum" AS ENUM('credit_card')`);
        await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "method" TYPE "public"."payment_method_enum" USING "method"::"text"::"public"."payment_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_method_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payment_method_enum_old" AS ENUM('credit_card', 'bank_slip', 'pix', 'bank_transfer')`);
        await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "method" TYPE "public"."payment_method_enum_old" USING "method"::"text"::"public"."payment_method_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."payment_method_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payment_method_enum_old" RENAME TO "payment_method_enum"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP CONSTRAINT "UQ_c33c1f2a1198fe31e1f3e1e674a"`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" ADD "currentUsers" integer`);
        await queryRunner.query(`ALTER TABLE "permission" ADD "category" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "permission" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}
