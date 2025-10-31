import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { Role } from './entities/role.entity';
import { RoleService } from './role.service';

@UseGuards(AuthGuard('jwt'))
@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Get()
    async findAll(@GetQueryOptions() options: QueryOptions<Role>, @Query('name') name?: string) {
        return this.roleService.findAll({ name }, options);
    }

    @Get('assignable')
    async findAssignable(@GetQueryOptions() options: QueryOptions<Role>) {
        return this.roleService.findAssignable(options);
    }

    @Get(':name')
    async findByName(@Param('name') name: string) {
        return this.roleService.findByName(name);
    }
}
