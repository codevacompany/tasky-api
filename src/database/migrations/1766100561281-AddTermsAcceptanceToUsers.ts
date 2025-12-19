import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTermsAcceptanceToUsers1766100561281 implements MigrationInterface {
    name = 'AddTermsAcceptanceToUsers1766100561281';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "user" ADD "termsAccepted" boolean NOT NULL DEFAULT false`,
        );
        await queryRunner.query(`ALTER TABLE "user" ADD "termsAcceptedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user" ADD "termsVersion" character varying`);
        await queryRunner.query(
            `ALTER TABLE "user" ADD "privacyPolicyAccepted" boolean NOT NULL DEFAULT false`,
        );
        await queryRunner.query(`ALTER TABLE "user" ADD "privacyPolicyAcceptedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user" ADD "privacyPolicyVersion" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "privacyPolicyVersion"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "privacyPolicyAcceptedAt"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "privacyPolicyAccepted"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "termsVersion"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "termsAcceptedAt"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "termsAccepted"`);
    }
}
