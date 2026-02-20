import { MigrationInterface, QueryRunner } from 'typeorm';
import { EncryptionService } from '../../shared/services/encryption/encryption.service';

export class RegenerateSearchTokensWithNewFormat1770577347350 implements MigrationInterface {
    name = 'RegenerateSearchTokensWithNewFormat1770577347350';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const encryptionService = new EncryptionService();
        const tickets = await queryRunner.query(`SELECT id, name, description FROM ticket`);
        const BATCH_SIZE = 50;

        for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
            const batch = tickets.slice(i, i + BATCH_SIZE);
            const updates: { id: number; nameTokens: string[]; descriptionTokens: string[] }[] = [];

            for (const ticket of batch) {
                try {
                    const decryptedName = encryptionService.decrypt(ticket.name);
                    const decryptedDescription = encryptionService.decrypt(ticket.description);
                    const nameTokens = encryptionService.createSearchTokens(decryptedName);
                    const descriptionTokens =
                        encryptionService.createSearchTokens(decryptedDescription);
                    updates.push({ id: ticket.id, nameTokens, descriptionTokens });
                } catch (error) {
                    console.error(`Error processing ticket ${ticket.id}:`, error);
                }
            }

            if (updates.length === 0) continue;

            const placeholders = updates
                .map(
                    (_, idx) =>
                        `($${idx * 3 + 1}::int, $${idx * 3 + 2}::text[], $${idx * 3 + 3}::text[])`,
                )
                .join(', ');
            const params = updates.flatMap((u) => [u.id, u.nameTokens, u.descriptionTokens]);

            await queryRunner.query(
                `UPDATE ticket SET "nameSearchTokens" = v."nameSearchTokens", "descriptionSearchTokens" = v."descriptionSearchTokens" ` +
                    `FROM (VALUES ${placeholders}) AS v(id, "nameSearchTokens", "descriptionSearchTokens") ` +
                    `WHERE ticket.id = v.id`,
                params,
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        void queryRunner;
        // No-op: reverting would require running the old token format, not practical
    }
}
