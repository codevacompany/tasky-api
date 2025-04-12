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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { GetQueryOptions } from '../../shared/decorators/get-query-options';
import { QueryOptions } from '../../shared/types/http';

@Controller('departments')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll(@GetQueryOptions() options: QueryOptions, @Query('name') name?: string) {
        return this.departmentService.findAll({ name }, options);
    }

    @Get(':name')
    @UseGuards(AuthGuard('jwt'))
    async findByName(@Param('name') name: string) {
        return this.departmentService.findByName(name);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() createDepartmentDto: CreateDepartmentDto) {
        return this.departmentService.create(createDepartmentDto);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDepartmentDto: UpdateDepartmentDto,
    ) {
        return this.departmentService.update(id, updateDepartmentDto);
    }
}
