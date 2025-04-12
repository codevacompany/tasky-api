import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { QueryOptions } from '../types/http';

export const GetQueryOptions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): QueryOptions => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;

    return {
      page,
      limit,
    };
  },
);
