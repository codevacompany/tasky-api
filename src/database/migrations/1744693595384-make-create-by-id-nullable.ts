import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeCreateByIdNullable1744693595384 implements MigrationInterface {
    name = 'MakeCreateByIdNullable1744693595384'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "category" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "department" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "verification_code" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_ab94760702f01d400c4e845fbe6"`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "createdById" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_ab94760702f01d400c4e845fbe6" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_ab94760702f01d400c4e845fbe6"`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_ab94760702f01d400c4e845fbe6" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "verification_code" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "department" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "createdById" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "category" ALTER COLUMN "createdById" SET NOT NULL`);
    }

}
