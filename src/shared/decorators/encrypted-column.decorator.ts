import { ValueTransformer } from 'typeorm';
import { EncryptionService } from '../services/encryption/encryption.service';

let encryptionService: EncryptionService;

/**
 * Gets encryption service instance (singleton)
 * Note: Consider using NestJS dependency injection in production
 */
function getEncryptionService(): EncryptionService {
    if (!encryptionService) {
        encryptionService = new EncryptionService();
    }
    return encryptionService;
}

/**
 * TypeORM transformer to automatically encrypt/decrypt column values
 *
 * Usage:
 * @Column({ transformer: encryptedTransformer })
 * cpf: string;
 */
export const encryptedTransformer: ValueTransformer = {
    to(value: string | null | undefined): string | null {
        if (!value) {
            return value;
        }
        try {
            const encryptionService = getEncryptionService();
            if (encryptionService.isEncrypted(value)) {
                return value;
            }
            return encryptionService.encrypt(value);
        } catch (error) {
            console.error('Encryption error:', error);
            throw error;
        }
    },
    from(value: string | null | undefined): string | null {
        if (!value) {
            return value;
        }
        try {
            return getEncryptionService().decrypt(value);
        } catch (error) {
            console.error('Decryption error:', error);
            return value;
        }
    },
};
