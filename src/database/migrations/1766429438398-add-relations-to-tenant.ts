import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRelationsToTenant1766429438398 implements MigrationInterface {
    name = 'AddRelationsToTenant1766429438398'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "correction_request" DROP CONSTRAINT "FK_5a1814b31d5c919bb1c1d0658ae"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP CONSTRAINT "FK_653665e6f8dd8c3d0d0f3a07598"`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP CONSTRAINT "FK_41bde59991e76ec1bab159a5cc0"`);
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "FK_6959c37c3acf0832103a2535703"`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" DROP CONSTRAINT "FK_0588c0effb6aad4f5d600871fab"`);
        await queryRunner.query(`ALTER TABLE "verification_code" ADD CONSTRAINT "FK_d020caf498956b9c9b6c1c9bb78" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category" ADD CONSTRAINT "FK_ecfa4b687173f2c9fe47b918c3c" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "department" ADD CONSTRAINT "FK_3e4a8c5002af8902cb5f6645d1d" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_685bf353c85f23b6f848e4dcded" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "correction_request" ADD CONSTRAINT "FK_fbff4d478e8f97386d6fda8ca4d" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "correction_request" ADD CONSTRAINT "FK_5a1814b31d5c919bb1c1d0658ae" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" ADD CONSTRAINT "FK_415f530a6a854ef677a8e9819c6" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_checklist_item" ADD CONSTRAINT "FK_280cb2b36c0093eab5b2737ace0" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD CONSTRAINT "FK_d61a0b946534c8d6dea2d38813a" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD CONSTRAINT "FK_653665e6f8dd8c3d0d0f3a07598" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" ADD CONSTRAINT "FK_36c7fb31928ad5b56b06f7ba0ad" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" ADD CONSTRAINT "FK_41bde59991e76ec1bab159a5cc0" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_file" ADD CONSTRAINT "FK_cdd38fd168505d2dd88bfd477e0" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_update" ADD CONSTRAINT "FK_c7781e602325b1fb0b0b6c66b08" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "status_column" ADD CONSTRAINT "FK_210b0e936dfe01bebac35045778" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "status_action" ADD CONSTRAINT "FK_1b5c7d698596b74c914fd138290" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_status" ADD CONSTRAINT "FK_6928c7fb4928cd0ccefce5c7ed5" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_f20ac6eb16146cce1ea97acfade" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_target_user" ADD CONSTRAINT "FK_c36167b70f60ea61e3d7c507614" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "FK_6959c37c3acf0832103a2535703" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" ADD CONSTRAINT "FK_0588c0effb6aad4f5d600871fab" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_734235b45e4310eb80816139bcf" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_734235b45e4310eb80816139bcf"`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" DROP CONSTRAINT "FK_0588c0effb6aad4f5d600871fab"`);
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "FK_6959c37c3acf0832103a2535703"`);
        await queryRunner.query(`ALTER TABLE "ticket_target_user" DROP CONSTRAINT "FK_c36167b70f60ea61e3d7c507614"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_f20ac6eb16146cce1ea97acfade"`);
        await queryRunner.query(`ALTER TABLE "ticket_status" DROP CONSTRAINT "FK_6928c7fb4928cd0ccefce5c7ed5"`);
        await queryRunner.query(`ALTER TABLE "status_action" DROP CONSTRAINT "FK_1b5c7d698596b74c914fd138290"`);
        await queryRunner.query(`ALTER TABLE "status_column" DROP CONSTRAINT "FK_210b0e936dfe01bebac35045778"`);
        await queryRunner.query(`ALTER TABLE "ticket_update" DROP CONSTRAINT "FK_c7781e602325b1fb0b0b6c66b08"`);
        await queryRunner.query(`ALTER TABLE "ticket_file" DROP CONSTRAINT "FK_cdd38fd168505d2dd88bfd477e0"`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP CONSTRAINT "FK_41bde59991e76ec1bab159a5cc0"`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" DROP CONSTRAINT "FK_36c7fb31928ad5b56b06f7ba0ad"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP CONSTRAINT "FK_653665e6f8dd8c3d0d0f3a07598"`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" DROP CONSTRAINT "FK_d61a0b946534c8d6dea2d38813a"`);
        await queryRunner.query(`ALTER TABLE "ticket_checklist_item" DROP CONSTRAINT "FK_280cb2b36c0093eab5b2737ace0"`);
        await queryRunner.query(`ALTER TABLE "ticket_cancellation_reason" DROP CONSTRAINT "FK_415f530a6a854ef677a8e9819c6"`);
        await queryRunner.query(`ALTER TABLE "correction_request" DROP CONSTRAINT "FK_5a1814b31d5c919bb1c1d0658ae"`);
        await queryRunner.query(`ALTER TABLE "correction_request" DROP CONSTRAINT "FK_fbff4d478e8f97386d6fda8ca4d"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_685bf353c85f23b6f848e4dcded"`);
        await queryRunner.query(`ALTER TABLE "department" DROP CONSTRAINT "FK_3e4a8c5002af8902cb5f6645d1d"`);
        await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "FK_ecfa4b687173f2c9fe47b918c3c"`);
        await queryRunner.query(`ALTER TABLE "verification_code" DROP CONSTRAINT "FK_d020caf498956b9c9b6c1c9bb78"`);
        await queryRunner.query(`ALTER TABLE "tenant_subscription" ADD CONSTRAINT "FK_0588c0effb6aad4f5d600871fab" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "FK_6959c37c3acf0832103a2535703" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_disapproval_reason" ADD CONSTRAINT "FK_41bde59991e76ec1bab159a5cc0" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_comment" ADD CONSTRAINT "FK_653665e6f8dd8c3d0d0f3a07598" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "correction_request" ADD CONSTRAINT "FK_5a1814b31d5c919bb1c1d0658ae" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
