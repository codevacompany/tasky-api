import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvoiceSentAtToPayment1768343417333 implements MigrationInterface {
    name = 'AddInvoiceSentAtToPayment1768343417333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" ADD "invoiceSentAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "invoiceSentAt"`);
    }

}
