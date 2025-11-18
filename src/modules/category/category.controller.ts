import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';
import { GetFindOneQueryOptions } from '../../shared/decorators/get-find-one-query-options.decorator';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { TenantAdminGuard } from '../../shared/guards/tenant-admin.guard';
import { FindOneQueryOptions, QueryOptions } from '../../shared/types/http';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { Category } from './entities/category.entity';

@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Category>,
    ) {
        return this.categoryService.findMany(accessProfile, options);
    }

    @Get('name/:name')
    @UseGuards(AuthGuard('jwt'))
    async findByName(
        @GetAccessProfile() acessProfile: AccessProfile,
        @GetFindOneQueryOptions() options: FindOneQueryOptions<Category>,
    ) {
        return this.categoryService.findByName(acessProfile, options);
    }

    /**
     * Get category by UUID (public-facing endpoint)
     */
    @Get(':uuid')
    @UseGuards(AuthGuard('jwt'))
    async findByUuid(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ): Promise<Category> {
        return this.categoryService.findByUuid(accessProfile, uuid);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    async create(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Body() createCategoryDto: CreateCategoryDto,
    ) {
        return this.categoryService.create(acessProfile, createCategoryDto);
    }

    /**
     * Update category by UUID (public-facing endpoint)
     */
    @Patch(':uuid')
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    async update(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ): Promise<Category> {
        return this.categoryService.updateCategoryByUuid(acessProfile, uuid, updateCategoryDto);
    }

    /**
     * Delete category by UUID (public-facing endpoint)
     */
    @Delete(':uuid')
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    async delete(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ) {
        await this.categoryService.deleteByUuid(accessProfile, uuid);
        return { message: 'Category deleted successfully' };
    }
}
