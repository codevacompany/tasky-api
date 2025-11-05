import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { StatusColumnService } from './status-column.service';
import { StatusColumn } from './entities/status-column.entity';

@Controller('status-columns')
export class StatusColumnController {
    constructor(private readonly statusColumnService: StatusColumnService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<StatusColumn>,
    ) {
        return this.statusColumnService.findMany(accessProfile, options);
    }
}


