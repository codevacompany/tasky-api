import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRoleTable1744935096563 implements MigrationInterface {
    name = 'CreateRoleTable1744935096563'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "isAdmin" TO "roleId"`);
        await queryRunner.query(`CREATE TABLE "role" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "isInternal" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "roleId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "roleId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "roleId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "roleId" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "isInternal"`);
        await queryRunner.query(`DROP TABLE "role"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "roleId" TO "isAdmin"`);
    }

}
