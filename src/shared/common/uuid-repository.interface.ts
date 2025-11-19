import { Repository } from 'typeorm';

/**
 * Interface for repositories that support UUID lookups
 */
export interface UUIDRepository<T> {
    findByUuid(uuid: string): Promise<T | null>;
    findByUuidOrFail(uuid: string): Promise<T>;
}

/**
 * Base repository class with UUID support
 * Extend this instead of Repository<T> to get UUID methods
 */
export abstract class BaseUUIDRepository<T extends { uuid: string }>
    extends Repository<T>
    implements UUIDRepository<T>
{
    async findByUuid(uuid: string): Promise<T | null> {
        return this.findOne({ where: { uuid } as any });
    }

    async findByUuidOrFail(uuid: string): Promise<T> {
        const entity = await this.findByUuid(uuid);
        if (!entity) {
            throw new Error(`Entity with UUID ${uuid} not found`);
        }
        return entity;
    }
}


