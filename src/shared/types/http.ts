import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';

export type QueryOptions<T> = {
    where?: FindOptionsWhere<T>;
    page?: number;
    limit?: number;
    relations?: string[];
    order?: FindOptionsOrder<T>;
    tenantAware?: boolean;
    paginated?: boolean; // Default value is handled in implementation
};

export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type FindOneQueryOptions<T> = {
    where?: FindOptionsWhere<T>;
    relations?: string[];
    tenantAware?: boolean;
};
