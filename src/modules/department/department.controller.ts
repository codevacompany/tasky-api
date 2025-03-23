import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';

@Controller('departments')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

    @Get()
    async findAll() {
        return this.departmentService.findAll();
    }

    @Get(':name')
    async findByName(@Param('name') name: string) {
        return this.departmentService.findByName(name);
    }

    @Post()
    async create(@Body() createDepartmentDto: CreateDepartmentDto) {
        return this.departmentService.create(createDepartmentDto);
    }

    @Put(':id')
    async update(@Param('id') id: number, @Body() updateDepartmentDto: UpdateDepartmentDto) {
        return this.departmentService.update(id, updateDepartmentDto);
    }
}
