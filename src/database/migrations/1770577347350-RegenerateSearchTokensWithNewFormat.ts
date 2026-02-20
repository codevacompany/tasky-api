import { MigrationInterface, QueryRunner } from 'typeorm';
import { EncryptionService } from '../../shared/services/encryption/encryption.service';

export class RegenerateSearchTokensWithNewFormat1770577347350 implements MigrationInterface {
    name = 'RegenerateSearchTokensWithNewFormat1770577347350';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const encryptionService = new EncryptionService();
        const BATCH_SIZE = 100;
        let lastProcessedId = 0;
        let hasMoreTickets = true;

        while (hasMoreTickets) {
            const batch: Array<{ id: number; name: string; description: string | null }> =
                await queryRunner.query(
                    `SELECT id, name, description
                     FROM ticket
                     WHERE id > $1
                     ORDER BY id ASC
                     LIMIT $2`,
                    [lastProcessedId, BATCH_SIZE],
                );

            if (batch.length === 0) {
                hasMoreTickets = false;
                continue;
            }

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

            lastProcessedId = batch[batch.length - 1].id;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        void queryRunner;
        // No-op: reverting would require running the old token format, not practical
    }
}
