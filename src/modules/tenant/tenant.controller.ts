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
import { UpdateTenantConsentDto } from './dtos/update-tenant-consent.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { TenantStatsResponseDto } from './dtos/tenant-with-stats.dto';
import { Tenant } from './entities/tenant.entity';
import { TenantService } from './tenant.service';
import { GetAccessProfile } from '../../shared/common/access-profile';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { TenantAdminGuard } from '../../shared/guards/tenant-admin.guard';

@Controller('tenants')
export class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    @Get('me')
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    async findMe(@GetAccessProfile() accessProfile: any) {
        return this.tenantService.findById(accessProfile.tenantId);
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    async updateMe(
        @GetAccessProfile() accessProfile: any,
        @Body() updateTenantDto: UpdateTenantDto,
    ) {
        return this.tenantService.update(accessProfile.tenantId, updateTenantDto);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async findAll(@GetQueryOptions() options: QueryOptions<Tenant>, @Query('name') name?: string) {
        return this.tenantService.findAll({ name }, options);
    }

    @Get('with-stats')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async findWithStats(
        @GetQueryOptions() options: QueryOptions<Tenant>,
        @Query('name') name?: string,
    ): Promise<TenantStatsResponseDto> {
        return this.tenantService.findWithStats({ name }, options);
    }

    @Get('by-email/:email')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async findByEmail(@Param('email') email: string) {
        return this.tenantService.findByEmail(email);
    }

    @Get('by-cnpj/:cnpj')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async findByCnpj(@Param('cnpj') cnpj: string) {
        return this.tenantService.findByCnpj(cnpj);
    }

    @Get('by-name/:name')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async findByName(@Param('name') name: string) {
        return this.tenantService.findByName(name);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async create(@Body() createTenantDto: CreateTenantDto) {
        return this.tenantService.create(createTenantDto);
    }

    @Get(':id/details')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async findDetails(@Param('id', ParseIntPipe) id: number) {
        return this.tenantService.findDetails(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async update(@Param('id', ParseIntPipe) id: number, @Body() updateTenantDto: UpdateTenantDto) {
        return this.tenantService.update(id, updateTenantDto);
    }

    @Patch(':id/consent')
    async updateConsent(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTenantConsentDto: UpdateTenantConsentDto,
    ) {
        return this.tenantService.updateConsent(id, updateTenantConsentDto);
    }
}
