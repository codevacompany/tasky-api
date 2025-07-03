import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePermissionsSystem1751134352849 implements MigrationInterface {
    name = 'CreatePermissionsSystem1751134352849'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permission" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "key" character varying(100) NOT NULL, "name" character varying(200) NOT NULL, "description" text, "category" character varying(50), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_20ff45fefbd3a7c04d2572c3bbd" UNIQUE ("key"), CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "subscription_plan_permission" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "subscriptionPlanId" integer NOT NULL, "permissionId" integer NOT NULL, CONSTRAINT "UQ_e65970816e111aebb044ebc38ab" UNIQUE ("subscriptionPlanId", "permissionId"), CONSTRAINT "PK_18f22c3223adda89c0c51183517" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "subscription_plan" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "slug" character varying(50) NOT NULL, "maxUsers" integer, "priceMonthly" numeric(10,2) NOT NULL, "priceYearly" numeric(10,2), "description" text, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_a8b506b29b6676308f7c0fc6613" UNIQUE ("slug"), CONSTRAINT "PK_5fde988e5d9b9a522d70ebec27c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payment_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')`);
        await queryRunner.query(`CREATE TYPE "public"."payment_method_enum" AS ENUM('credit_card', 'bank_slip', 'pix', 'bank_transfer')`);
        await queryRunner.query(`CREATE TABLE "payment" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "amount" numeric(10,2) NOT NULL, "dueDate" TIMESTAMP NOT NULL, "paidAt" TIMESTAMP, "status" "public"."payment_status_enum" NOT NULL DEFAULT 'pending', "method" "public"."payment_method_enum", "externalTransactionId" character varying, "description" text, "invoiceUrl" character varying, "metadata" json, "tenantSubscriptionId" integer NOT NULL, CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tenant_subscription_status_enum" AS ENUM('trial', 'active', 'suspended', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "tenant_subscription" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, "tenantId" integer NOT NULL, "updatedById" integer, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP, "trialEndDate" TIMESTAMP, "cancelledAt" TIMESTAMP, "status" "public"."tenant_subscription_status_enum" NOT NULL DEFAULT 'trial', "currentUsers" integer, "subscriptionPlanId" integer NOT NULL, CONSTRAINT "PK_d91b66c187ed664d890944a9776" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "subscription_plan_permission" ADD CONSTRAINT "FK_3de29fba282c65be857c280ea1b" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plan"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscription_plan_permission" ADD CONSTRAINT "FK_c034f0b394503233545e5251d66" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "FK_6959c37c3acf0832103a2535703" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "FK_553cacf58d4200a59a3b048fc04" FOREIGN KEY ("tenantSubscriptionId") REFERENCES "tenant_subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" ADD CONSTRAINT "FK_0588c0effb6aad4f5d600871fab" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" ADD CONSTRAINT "FK_ebb7b50d8654e6669d27da5c7cb" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_subscription" DROP CONSTRAINT "FK_ebb7b50d8654e6669d27da5c7cb"`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" DROP CONSTRAINT "FK_0588c0effb6aad4f5d600871fab"`);
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "FK_553cacf58d4200a59a3b048fc04"`);
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "FK_6959c37c3acf0832103a2535703"`);
        await queryRunner.query(`ALTER TABLE "subscription_plan_permission" DROP CONSTRAINT "FK_c034f0b394503233545e5251d66"`);
        await queryRunner.query(`ALTER TABLE "subscription_plan_permission" DROP CONSTRAINT "FK_3de29fba282c65be857c280ea1b"`);
        await queryRunner.query(`DROP TABLE "tenant_subscription"`);
        await queryRunner.query(`DROP TYPE "public"."tenant_subscription_status_enum"`);
        await queryRunner.query(`DROP TABLE "payment"`);
        await queryRunner.query(`DROP TYPE "public"."payment_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
        await queryRunner.query(`DROP TABLE "subscription_plan"`);
        await queryRunner.query(`DROP TABLE "subscription_plan_permission"`);
        await queryRunner.query(`DROP TABLE "permission"`);
    }

}
