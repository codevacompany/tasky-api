import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSignUpAndLegalDocument1747525999849 implements MigrationInterface {
    name = 'CreateSignUpAndLegalDocument1747525999849'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sign_up" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "companyName" character varying NOT NULL, "email" character varying NOT NULL DEFAULT '', "phoneNumber" character varying, "cep" character varying, "state" character varying, "city" character varying, "neighborhood" character varying, "street" character varying, "number" character varying, "complement" character varying, "companySize" character varying, "mainActivity" character varying, "contactName" character varying NOT NULL, "contactCpf" character varying NOT NULL, "contactEmail" character varying NOT NULL, "contactPhone" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "activationToken" character varying, "completedAt" TIMESTAMP, "termsAccepted" boolean NOT NULL DEFAULT false, "termsAcceptedAt" TIMESTAMP, "termsVersion" character varying, "privacyPolicyAccepted" boolean NOT NULL DEFAULT false, "privacyPolicyAcceptedAt" TIMESTAMP, "privacyPolicyVersion" character varying, CONSTRAINT "PK_7dc025543e948dd1cc22d89c0bd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."legal_document_type_enum" AS ENUM('terms_of_service', 'privacy_policy')`);
        await queryRunner.query(`CREATE TABLE "legal_document" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "type" "public"."legal_document_type_enum" NOT NULL, "version" character varying NOT NULL, "content" text NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "effectiveDate" TIMESTAMP, "requiresExplicitConsent" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_950166ad59d051a80cad8337c76" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d32de05ac2575932a54efa79d4" ON "legal_document" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_4f139b5bb9176aa3dd9fa7fa1e" ON "legal_document" ("version") `);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "email" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "phoneNumber" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "cep" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "state" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "city" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "neighborhood" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "street" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "number" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "complement" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "companySize" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "mainActivity" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "termsAccepted" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "termsAcceptedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "termsVersion" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "privacyPolicyAccepted" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "privacyPolicyAcceptedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tenant" ADD "privacyPolicyVersion" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "privacyPolicyVersion"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "privacyPolicyAcceptedAt"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "privacyPolicyAccepted"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "termsVersion"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "termsAcceptedAt"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "termsAccepted"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "mainActivity"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "companySize"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "complement"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "number"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "street"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "neighborhood"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "cep"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "phoneNumber"`);
        await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN "email"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4f139b5bb9176aa3dd9fa7fa1e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d32de05ac2575932a54efa79d4"`);
        await queryRunner.query(`DROP TABLE "legal_document"`);
        await queryRunner.query(`DROP TYPE "public"."legal_document_type_enum"`);
        await queryRunner.query(`DROP TABLE "sign_up"`);
    }

}
