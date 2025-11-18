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

    @Get('name/:name')
    async findByName(@GetAccessProfile() acessProfile: AccessProfile, @Param('name') name: string) {
        return this.departmentService.findByName(acessProfile, name);
    }

    /**
     * Get department by UUID (public-facing endpoint)
     */
    @Get(':uuid')
    async findByUuid(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ): Promise<Department> {
        return this.departmentService.findByUuid(acessProfile, uuid);
    }

    @Post()
    async create(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Body() dto: CreateDepartmentDto,
    ) {
        return this.departmentService.create(acessProfile, dto);
    }

    /**
     * Update department by UUID (public-facing endpoint)
     */
    @Patch(':uuid')
    async update(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @Body() dto: UpdateDepartmentDto,
    ): Promise<Department> {
        return this.departmentService.updateDepartmentByUuid(acessProfile, uuid, dto);
    }

    /**
     * Delete department by UUID (public-facing endpoint)
     */
    @Delete(':uuid')
    async delete(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ) {
        await this.departmentService.deleteByUuid(acessProfile, uuid);
        return { message: 'Successfully deleted!' };
    }
}
