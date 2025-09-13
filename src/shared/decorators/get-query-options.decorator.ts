import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { QueryOptions } from '../types/http';

export const GetQueryOptions = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): QueryOptions<any> => {
        const request = ctx.switchToHttp().getRequest();
        const { page = '1', limit = '10', sortBy, sortOrder, ...filters } = request.query;

        const options: QueryOptions<any> = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            where: Object.entries(filters).reduce(
                (acc, [key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                },
                {} as Record<string, any>,
            ),
        };

        // Handle sorting parameters
        if (sortBy && sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) {
            options.order = { [sortBy]: sortOrder };
        }

        return options;
    },
);
