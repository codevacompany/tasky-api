import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('departments')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll() {
        return this.departmentService.findAll();
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
