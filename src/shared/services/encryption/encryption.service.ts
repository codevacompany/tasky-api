import { Injectable } from '@nestjs/common';
import { compare, compareSync, hash, hashSync } from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Encryption service for sensitive data and password hashing
 * - Password hashing: bcrypt (irreversible)
 * - Data encryption: AES-256-GCM (reversible)
 */
@Injectable()
export class EncryptionService {
    readonly defaultSaltRounds = 12;
    private readonly algorithm = 'aes-256-gcm';
    private readonly ivLength = 16;

    compare(password: string, hash: string): Promise<boolean> {
        return compare(password, hash);
    }

    compareSync(password: string, hash: string): boolean {
        return compareSync(password, hash);
    }

    hash(password: string, saltRounds?: number): Promise<string> {
        return hash(password, saltRounds ?? this.defaultSaltRounds);
    }

    hashSync(password: string, saltRounds?: number): string {
        return hashSync(password, saltRounds ?? this.defaultSaltRounds);
    }

    /**
     * Gets encryption key from environment variable
     * Key must be at least 32 characters
     * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     */
    private getEncryptionKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error('ENCRYPTION_KEY not configured in environment variables');
        }

        if (key.length < 32) {
            return crypto.createHash('sha256').update(key).digest();
        }

        return Buffer.from(key.slice(0, 32));
    }

    /**
     * Encrypts a value using AES-256-GCM
     * @returns String in format "iv:tag:encrypted" (all in hex)
     */
    encrypt(value: string | null | undefined): string | null {
        if (!value) {
            return value;
        }

        try {
            const key = this.getEncryptionKey();
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipheriv(
                this.algorithm,
                key as crypto.CipherKey,
                iv as crypto.BinaryLike,
            );

            let encrypted = cipher.update(value, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();

            return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
        } catch (error) {
            throw new Error(`Encryption error: ${error.message}`);
        }
    }

    /**
     * Decrypts a value using AES-256-GCM
     * @param encryptedValue String in format "iv:tag:encrypted"
     * @returns Decrypted value, or original value if not encrypted (backward compatibility)
     */
    decrypt(encryptedValue: string | null | undefined): string | null {
        if (!encryptedValue) {
            return encryptedValue;
        }

        try {
            const parts = encryptedValue.split(':');
            if (parts.length !== 3) {
                return encryptedValue;
            }

            const [ivHex, tagHex, encrypted] = parts;

            // Validate IV format: must be hex and correct length (16 bytes = 32 hex chars)
            if (!/^[0-9a-f]+$/i.test(ivHex) || ivHex.length !== 32) {
                return encryptedValue;
            }

            // Validate tag format: must be hex
            if (!/^[0-9a-f]+$/i.test(tagHex)) {
                return encryptedValue;
            }

            // Validate encrypted data format: must be hex
            if (!/^[0-9a-f]+$/i.test(encrypted)) {
                return encryptedValue;
            }

            const key = this.getEncryptionKey();
            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');

            // Validate IV length matches expected size
            if (iv.length !== this.ivLength) {
                return encryptedValue;
            }

            const decipher = crypto.createDecipheriv(
                this.algorithm,
                key as crypto.CipherKey,
                iv as crypto.BinaryLike,
            );
            decipher.setAuthTag(tag as any);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            // Silently return original value for backward compatibility with unencrypted data
            return encryptedValue;
        }
    }

    /**
     * Checks if a value is encrypted (format: iv:tag:encrypted)
     */
    isEncrypted(value: string | null | undefined): boolean {
        if (!value) {
            return false;
        }
        const parts = value.split(':');
        return (
            parts.length === 3 &&
            parts.every((part) => /^[0-9a-f]+$/i.test(part) && part.length > 0)
        );
    }

    hashSearchable(value: string | null | undefined): string | null {
        if (!value) {
            return null;
        }

        // Normalize: remove all non-digit characters
        const normalized = value.replace(/[^\d]/g, '');

        if (!normalized) {
            return null;
        }

        // Create SHA-256 hash (deterministic - same input = same output)
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    /**
     * Creates search tokens from text for partial search on encrypted fields
     * Generates tokens from full words and all possible substrings for flexible partial matching
     *
     * @param text The text to tokenize
     * @param minWordLength Minimum word length to include (default: 2)
     * @param minSubstringLength Minimum substring length to generate (default: 2)
     * @returns Array of hashed tokens
     *
     * @example
     * // "bug" -> ["hash_bug", "hash_bu", "hash_ug"]
     * // "crítico" -> ["hash_critico", "hash_cr", "hash_cri", "hash_crit", ..., "hash_tico", "hash_ico", "hash_co"]
     * const tokens = encryptionService.createSearchTokens("bug crítico");
     */
    createSearchTokens(
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

            for (let i = 0; i < word.length; i++) {
                for (let j = i + minSubstringLength; j <= word.length; j++) {
                    const substring = word.substring(i, j);
                    tokens.add(crypto.createHash('sha256').update(substring).digest('hex'));
                }
            }
        }

        return Array.from(tokens);
    }
}
