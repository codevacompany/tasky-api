import { FindOptionsWhere, FindOptionsOrder } from 'typeorm';

export type QueryOptions<T> = {
    where?: FindOptionsWhere<T>;
    page: number;
    limit: number;
    relations?: string[];
    order?: FindOptionsOrder<T>;
};

export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
