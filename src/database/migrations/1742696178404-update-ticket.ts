import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTicket1742696178404 implements MigrationInterface {
    name = 'UpdateTicket1742696178404'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket" ADD "targetUserId" integer`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_40e4144132be73232ff19eb6e3e"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "ticketId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_00aa98d082bd5c1121de4e4718d"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_845cf1935d1650bca6c521602d7"`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "departmentId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "requesterId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_3d6915a33798152a079997cad28"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "departmentId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_40e4144132be73232ff19eb6e3e" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_00aa98d082bd5c1121de4e4718d" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_845cf1935d1650bca6c521602d7" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_ffbc3abfcba5686e3af922a39c4" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_3d6915a33798152a079997cad28" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_3d6915a33798152a079997cad28"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_ffbc3abfcba5686e3af922a39c4"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_845cf1935d1650bca6c521602d7"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_00aa98d082bd5c1121de4e4718d"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_40e4144132be73232ff19eb6e3e"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "departmentId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_3d6915a33798152a079997cad28" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "requesterId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ALTER COLUMN "departmentId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_845cf1935d1650bca6c521602d7" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_00aa98d082bd5c1121de4e4718d" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ALTER COLUMN "ticketId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_40e4144132be73232ff19eb6e3e" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "targetUserId"`);
    }

}
