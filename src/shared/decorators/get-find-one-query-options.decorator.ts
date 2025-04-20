import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FindOneQueryOptions } from '../types/http';

export const GetFindOneQueryOptions = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): FindOneQueryOptions<any> => {
        const request = ctx.switchToHttp().getRequest();

        return {
            where: Object.entries(request.query).reduce(
                (acc, [key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                },
                {} as Record<string, any>,
            ),
        };
    },
);
