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
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { Department } from './entities/department.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('departments')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

    @Get()
    async findAll(
        @GetAccessProfile() acessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<Department>,
    ) {
        return this.departmentService.findMany(acessProfile, options);
    }

    @Get(':name')
    async findByName(@GetAccessProfile() acessProfile: AccessProfile, @Param('name') name: string) {
        return this.departmentService.findByName(acessProfile, name);
    }

    @Post()
    async create(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Body() dto: CreateDepartmentDto,
    ) {
        return this.departmentService.create(acessProfile, dto);
    }

    @Patch(':id')
    async update(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDepartmentDto,
    ) {
        return this.departmentService.update(acessProfile, id, dto);
    }

    @Delete(':id')
    async delete(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.departmentService.delete(acessProfile, id);
        return { message: 'Successfully deleted!' };
    }
}
