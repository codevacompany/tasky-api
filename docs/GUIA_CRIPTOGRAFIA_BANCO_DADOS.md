# Guia de Implementação de Criptografia no Banco de Dados - Tasky Pro

**Como criptografar dados sensíveis no PostgreSQL usando TypeORM**

---

## 📋 VISÃO GERAL

Este guia mostra como implementar criptografia de dados sensíveis no banco de dados PostgreSQL usando TypeORM e NestJS. Existem duas abordagens principais:

1. **Criptografia de Nível de Aplicação**: Criptografa/descriptografa na aplicação antes de salvar no banco
2. **Criptografia de Nível de Banco**: Usa funções nativas do PostgreSQL (pgcrypto)

**Recomendação**: Usar criptografia de nível de aplicação para maior controle e portabilidade.

---

## 🔧 INSTALAÇÃO DE DEPENDÊNCIAS

```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

Ou usando biblioteca mais moderna:

```bash
npm install node:crypto  # Já incluído no Node.js
```

---

## 🛠️ IMPLEMENTAÇÃO

### 1. Criar Serviço de Criptografia

Crie um serviço centralizado para gerenciar a criptografia:

**`src/shared/services/encryption.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16; // 128 bits
    private readonly saltLength = 64;
    private readonly tagLength = 16;

    /**
     * Obtém a chave de criptografia a partir de variável de ambiente
     * IMPORTANTE: Nunca commitar esta chave no código!
     */
    private getEncryptionKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error('ENCRYPTION_KEY não configurada nas variáveis de ambiente');
        }

        // Se a chave for menor que 32 bytes, fazer hash SHA-256
        if (key.length < 32) {
            return crypto.createHash('sha256').update(key).digest();
        }

        return Buffer.from(key.slice(0, 32));
    }

    /**
     * Criptografa um valor usando AES-256-GCM
     */
    encrypt(value: string): string {
        if (!value) {
            return value;
        }

        const key = this.getEncryptionKey();
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);

        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();

        // Formato: iv:tag:encrypted
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }

    /**
     * Descriptografa um valor usando AES-256-GCM
     */
    decrypt(encryptedValue: string): string {
        if (!encryptedValue) {
            return encryptedValue;
        }

        try {
            const parts = encryptedValue.split(':');
            if (parts.length !== 3) {
                throw new Error('Formato de valor criptografado inválido');
            }

            const [ivHex, tagHex, encrypted] = parts;
            const key = this.getEncryptionKey();
            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');

            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            decipher.setAuthTag(tag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error(`Erro ao descriptografar: ${error.message}`);
        }
    }

    /**
     * Hash de senha usando bcrypt (para senhas de usuários)
     */
    async hashPassword(password: string): Promise<string> {
        const bcrypt = require('bcrypt');
        const saltRounds = 12; // Cost factor recomendado
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Verifica senha usando bcrypt
     */
    async comparePassword(password: string, hash: string): Promise<boolean> {
        const bcrypt = require('bcrypt');
        return bcrypt.compare(password, hash);
    }
}
```

---

### 2. Criar Transformer Customizado para TypeORM

**`src/shared/decorators/encrypted-column.decorator.ts`**

```typescript
import { ValueTransformer } from 'typeorm';
import { EncryptionService } from '../services/encryption.service';

// Instância singleton do serviço de criptografia
let encryptionService: EncryptionService;

export function getEncryptionService(): EncryptionService {
    if (!encryptionService) {
        encryptionService = new EncryptionService();
    }
    return encryptionService;
}

/**
 * Transformer para criptografar/descriptografar automaticamente valores
 */
export const encryptedTransformer: ValueTransformer = {
    to(value: string | null): string | null {
        if (!value) {
            return value;
        }
        return getEncryptionService().encrypt(value);
    },
    from(value: string | null): string | null {
        if (!value) {
            return value;
        }
        return getEncryptionService().decrypt(value);
    },
};
```

---

### 3. Atualizar Entidades para Usar Criptografia

#### Exemplo: Entidade SignUp (com CPF e CNPJ)

**`src/modules/sign-up/entities/sign-up.entity.ts`**

```typescript
import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { encryptedTransformer } from '../../../shared/decorators/encrypted-column.decorator';

@Entity()
export class SignUp extends IdTimestampBaseEntity {
    @Column()
    companyName: string;

    @Column({ default: '' })
    email: string;

    // CNPJ criptografado
    @Column({
        nullable: true,
        transformer: encryptedTransformer,
    })
    cnpj: string;

    @Column({ nullable: true })
    phoneNumber: string;

    // CPF criptografado
    @Column({
        transformer: encryptedTransformer,
    })
    contactCpf: string;

    @Column()
    contactEmail: string;

    @Column()
    contactPhone: string;

    // ... outros campos
}
```

#### Exemplo: Entidade Tenant (com CNPJ)

**`src/modules/tenant/entities/tenant.entity.ts`**

```typescript
import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { encryptedTransformer } from '../../../shared/decorators/encrypted-column.decorator';

@Entity()
export class Tenant extends IdTimestampBaseEntity {
    @Column()
    name: string;

    @Column({ default: '' })
    email: string;

    // CNPJ criptografado
    @Column({
        nullable: true,
        transformer: encryptedTransformer,
    })
    cnpj: string;

    // ... outros campos
}
```

---

### 4. Configurar Variável de Ambiente

**`.env` ou `.env.production`**

```env
# Chave de criptografia (32 caracteres ou mais)
# IMPORTANTE: Gerar uma chave segura e nunca commitar no código!
ENCRYPTION_KEY=your-super-secret-encryption-key-minimum-32-characters-long

# Exemplo de como gerar uma chave segura:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Gerar chave segura:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 5. Atualizar Módulo para Incluir EncryptionService

**`src/shared/shared.module.ts`**

```typescript
import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './services/encryption.service';

@Global()
@Module({
    providers: [EncryptionService],
    exports: [EncryptionService],
})
export class SharedModule {}
```

---

## 📝 EXEMPLOS PRÁTICOS POR TIPO DE DADO

### CPF e CNPJ

```typescript
@Column({
    nullable: true,
    transformer: encryptedTransformer
})
cpf: string;

@Column({
    nullable: true,
    transformer: encryptedTransformer
})
cnpj: string;
```

### Senhas (usar hash, não criptografia)

```typescript
// No serviço de autenticação
async createUser(userData: CreateUserDto) {
    const hashedPassword = await this.encryptionService.hashPassword(userData.password);

    return this.userRepository.save({
        ...userData,
        password: hashedPassword, // Armazenar hash, não texto plano
    });
}

// Na entidade
@Column()
password: string; // Armazenará o hash bcrypt
```

### Tokens de Autenticação

```typescript
@Column({
    nullable: true,
    transformer: encryptedTransformer
})
refreshToken: string;

@Column({
    nullable: true,
    transformer: encryptedTransformer
})
activationToken: string;
```

### E-mail e Telefone (Recomendado)

```typescript
@Column({
    transformer: encryptedTransformer
})
email: string;

@Column({
    nullable: true,
    transformer: encryptedTransformer
})
phoneNumber: string;
```

---

## 🔄 MIGRAÇÃO DE DADOS EXISTENTES

Se você já tem dados no banco, precisa criar uma migration para criptografar os dados existentes:

**`src/database/migrations/XXXXXX-encrypt-sensitive-data.ts`**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';
import { EncryptionService } from '../../shared/services/encryption.service';

export class EncryptSensitiveData1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const encryptionService = new EncryptionService();

        // Criptografar CNPJs existentes na tabela tenant
        const tenants = await queryRunner.query(
            'SELECT id, cnpj FROM tenant WHERE cnpj IS NOT NULL',
        );

        for (const tenant of tenants) {
            if (tenant.cnpj && !tenant.cnpj.includes(':')) {
                // Verificar se já não está criptografado
                const encrypted = encryptionService.encrypt(tenant.cnpj);
                await queryRunner.query(`UPDATE tenant SET cnpj = $1 WHERE id = $2`, [
                    encrypted,
                    tenant.id,
                ]);
            }
        }

        // Criptografar CPFs existentes na tabela sign_up
        const signUps = await queryRunner.query(
            'SELECT id, contact_cpf FROM sign_up WHERE contact_cpf IS NOT NULL',
        );

        for (const signUp of signUps) {
            if (signUp.contact_cpf && !signUp.contact_cpf.includes(':')) {
                const encrypted = encryptionService.encrypt(signUp.contact_cpf);
                await queryRunner.query(`UPDATE sign_up SET contact_cpf = $1 WHERE id = $2`, [
                    encrypted,
                    signUp.id,
                ]);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const encryptionService = new EncryptionService();

        // Descriptografar CNPJs
        const tenants = await queryRunner.query(
            'SELECT id, cnpj FROM tenant WHERE cnpj IS NOT NULL',
        );

        for (const tenant of tenants) {
            if (tenant.cnpj && tenant.cnpj.includes(':')) {
                try {
                    const decrypted = encryptionService.decrypt(tenant.cnpj);
                    await queryRunner.query(`UPDATE tenant SET cnpj = $1 WHERE id = $2`, [
                        decrypted,
                        tenant.id,
                    ]);
                } catch (error) {
                    console.error(`Erro ao descriptografar CNPJ do tenant ${tenant.id}:`, error);
                }
            }
        }

        // Descriptografar CPFs
        const signUps = await queryRunner.query(
            'SELECT id, contact_cpf FROM sign_up WHERE contact_cpf IS NOT NULL',
        );

        for (const signUp of signUps) {
            if (signUp.contact_cpf && signUp.contact_cpf.includes(':')) {
                try {
                    const decrypted = encryptionService.decrypt(signUp.contact_cpf);
                    await queryRunner.query(`UPDATE sign_up SET contact_cpf = $1 WHERE id = $2`, [
                        decrypted,
                        signUp.id,
                    ]);
                } catch (error) {
                    console.error(`Erro ao descriptografar CPF do sign_up ${signUp.id}:`, error);
                }
            }
        }
    }
}
```

---

## 🔐 ALTERNATIVA: Criptografia com PostgreSQL pgcrypto

Se preferir usar funções nativas do PostgreSQL:

### 1. Habilitar Extensão pgcrypto

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 2. Criar Funções de Criptografia

```sql
-- Função para criptografar
CREATE OR REPLACE FUNCTION encrypt_value(value TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(value, key),
        'base64'
    );
END;
$$ LANGUAGE plpgsql;

-- Função para descriptografar
CREATE OR REPLACE FUNCTION decrypt_value(encrypted_value TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(encrypted_value, 'base64'),
        key
    );
END;
$$ LANGUAGE plpgsql;
```

### 3. Usar em Queries

```typescript
// Criptografar ao inserir
await queryRunner.query(`INSERT INTO tenant (cnpj) VALUES (encrypt_value($1, $2))`, [
    cnpjValue,
    process.env.ENCRYPTION_KEY,
]);

// Descriptografar ao ler
const result = await queryRunner.query(
    `SELECT decrypt_value(cnpj, $1) as cnpj FROM tenant WHERE id = $2`,
    [process.env.ENCRYPTION_KEY, tenantId],
);
```

**Desvantagem**: Menos portável, requer configuração no banco.

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

-   [ ] Instalar dependências de criptografia
-   [ ] Criar `EncryptionService`
-   [ ] Criar `encryptedTransformer` para TypeORM
-   [ ] Configurar `ENCRYPTION_KEY` nas variáveis de ambiente
-   [ ] Atualizar entidades com campos sensíveis (CPF, CNPJ)
-   [ ] Criar migration para criptografar dados existentes
-   [ ] Testar criptografia/descriptografia
-   [ ] Documentar processo de rotação de chaves
-   [ ] Configurar backup seguro da chave de criptografia
-   [ ] Implementar logs de acesso a dados criptografados

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### Segurança da Chave

1. **Nunca commitar a chave no código**
2. **Usar variáveis de ambiente** ou gerenciadores de secrets (AWS Secrets Manager, HashiCorp Vault)
3. **Rotacionar chaves periodicamente** (requer re-criptografia de dados)
4. **Backup seguro da chave** em local separado e seguro

### Performance

-   Criptografia adiciona overhead (~1-5ms por operação)
-   Considerar cache para dados frequentemente acessados
-   Usar índices em campos não criptografados quando possível

### Busca em Dados Criptografados

-   **Não é possível** fazer busca direta em dados criptografados
-   Soluções:
    -   Criar hash indexável para busca (ex: hash do CPF para busca)
    -   Usar busca full-text em dados não sensíveis
    -   Descriptografar em memória para busca (não recomendado para grandes volumes)

### Rotação de Chaves

Se precisar rotacionar a chave de criptografia:

1. Criar nova chave
2. Descriptografar com chave antiga
3. Criptografar com chave nova
4. Atualizar variável de ambiente
5. Manter chave antiga por período de transição

---

## 📚 REFERÊNCIAS

-   [TypeORM Transformers](https://typeorm.io/entities#column-transformer)
-   [Node.js Crypto](https://nodejs.org/api/crypto.html)
-   [PostgreSQL pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html)
-   [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

**Última atualização**: Janeiro de 2025
