import { MigrationInterface, QueryRunner } from "typeorm";
import { EncryptionService } from "../../shared/services/encryption/encryption.service";
import * as crypto from "crypto";

export class AddDescriptionSearchTokensToTicket1770431081607 implements MigrationInterface {
    name = 'AddDescriptionSearchTokensToTicket1770431081607'

    private createSearchTokens(
        text: string | null | undefined,
        minWordLength: number = 2,
        minSubstringLength: number = 2,
    ): string[] {
        if (!text) {
            return [];
        }

        // Normalize: lowercase, remove accents
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
            .trim();

        const tokens = new Set<string>();

        // Split into words and generate tokens for each word
        const words = normalized.split(/\s+/).filter((word) => word.length >= minWordLength);

        for (const word of words) {
            tokens.add(crypto.createHash('sha256').update(word).digest('hex'));

            // Always include single-character prefix for first character to support single-char searches
            if (word.length > 0) {
                tokens.add(crypto.createHash('sha256').update(word[0]).digest('hex'));
            }

            for (let i = 0; i < word.length; i++) {
                for (let j = i + minSubstringLength; j <= word.length; j++) {
                    const substring = word.substring(i, j);
                    tokens.add(crypto.createHash('sha256').update(substring).digest('hex'));
                }
            }
        }

        return Array.from(tokens);
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the column
        await queryRunner.query(`ALTER TABLE "ticket" ADD "descriptionSearchTokens" text array`);

        // Create GIN index for fast array searches
        await queryRunner.query(`CREATE INDEX "IDX_ticket_descriptionSearchTokens" ON "ticket" USING GIN ("descriptionSearchTokens")`);

        // Regenerate tokens for all existing tickets to include single-character prefixes
        // Process in batches to avoid timeout on large datasets
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
                    const nameTokens = this.createSearchTokens(decryptedName);
                    const descriptionTokens = this.createSearchTokens(decryptedDescription);
                    updates.push({ id: ticket.id, nameTokens, descriptionTokens });
                } catch (error) {
                    console.error(`Error processing ticket ${ticket.id}:`, error);
                }
            }

            if (updates.length === 0) continue;

            // Batch update using PostgreSQL VALUES + JOIN
            const placeholders = updates
                .map(
                    (_, idx) =>
                        `($${idx * 3 + 1}::int, $${idx * 3 + 2}::text[], $${idx * 3 + 3}::text[])`
                )
                .join(', ');
            const params = updates.flatMap((u) => [u.id, u.nameTokens, u.descriptionTokens]);

            await queryRunner.query(
                `UPDATE ticket SET "nameSearchTokens" = v."nameSearchTokens", "descriptionSearchTokens" = v."descriptionSearchTokens" ` +
                    `FROM (VALUES ${placeholders}) AS v(id, "nameSearchTokens", "descriptionSearchTokens") ` +
                    `WHERE ticket.id = v.id`,
                params
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_ticket_descriptionSearchTokens"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "descriptionSearchTokens"`);
    }

}
