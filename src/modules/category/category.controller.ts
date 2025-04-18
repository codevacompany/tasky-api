import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { GetUser } from '../../shared/decorators/get-user.decorator';
import { QueryOptions } from '../../shared/types/http';
import { User } from '../user/entities/user.entity';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { Category } from './entities/category.entity';

@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll(@GetUser() user: User, @GetQueryOptions() options: QueryOptions<Category>) {
        return this.categoryService.findMany(user, options);
    }

    @Get(':name')
    @UseGuards(AuthGuard('jwt'))
    async findByName(@GetUser() user: User, @Param('name') name: string) {
        return this.categoryService.findByName(user, name);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@GetUser() user: User, @Body() createCategoryDto: CreateCategoryDto) {
        return this.categoryService.create(user, createCategoryDto);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        return this.categoryService.update(user, id, updateCategoryDto);
    }
}
