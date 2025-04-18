import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { TenantService } from './tenant.service';
import { Tenant } from './entities/tenant.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('tenants')
export class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    @Get()
    async findAll(@GetQueryOptions() options: QueryOptions<Tenant>, @Query('name') name?: string) {
        return this.tenantService.findAll({ name }, options);
    }

    @Get(':name')
    async findByName(@Param('name') name: string) {
        return this.tenantService.findByName(name);
    }

    @Post()
    async create(@Body() createTenantDto: CreateTenantDto) {
        return this.tenantService.create(createTenantDto);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTenantDto: UpdateTenantDto,
    ) {
        return this.tenantService.update(id, updateTenantDto);
    }
}
