import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
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

    @Get(':name')
    @UseGuards(AuthGuard('jwt'))
    async findByName(
        @GetAccessProfile() acessProfile: AccessProfile,
        @GetFindOneQueryOptions() options: FindOneQueryOptions<Category>,
    ) {
        return this.categoryService.findByName(acessProfile, options);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    async create(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Body() createCategoryDto: CreateCategoryDto,
    ) {
        return this.categoryService.create(acessProfile, createCategoryDto);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    async update(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        return this.categoryService.update(acessProfile, id, updateCategoryDto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), TenantAdminGuard)
    async delete(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.categoryService.delete(accessProfile, id);
        return { message: 'Category deleted successfully', id };
    }
}
