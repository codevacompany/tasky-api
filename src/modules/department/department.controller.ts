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
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { GetUser } from '../../shared/decorators/get-user.decorator';
import { QueryOptions } from '../../shared/types/http';
import { User } from '../user/entities/user.entity';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { Department } from './entities/department.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('departments')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

    @Get()
    async findAll(@GetUser() user: User, @GetQueryOptions() options: QueryOptions<Department>) {
        return this.departmentService.findMany(user, options);
    }

    @Get(':name')
    async findByName(@GetUser() user: User, @Param('name') name: string) {
        return this.departmentService.findByName(user, name);
    }

    @Post()
    async create(@GetUser() user: User, @Body() dto: CreateDepartmentDto) {
        return this.departmentService.create(user, dto);
    }

    @Patch(':id')
    async update(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDepartmentDto,
    ) {
        return this.departmentService.update(user, id, dto);
    }

    @Delete(':id')
    async delete(@GetUser() user: User, @Param('id', ParseIntPipe) id: number) {
        await this.departmentService.delete(user, id);
        return { message: 'Successfully deleted!' };
    }
}
