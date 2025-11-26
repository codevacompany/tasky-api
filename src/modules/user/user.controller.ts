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
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';
import { CreateUserDto } from './dtos/create-user.dto';
import { SuperAdminCreateUserDto } from './dtos/super-admin-create-user.dto copy';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { FindOneQueryOptions, QueryOptions } from '../../shared/types/http';

@Controller('users')
@UseGuards(AuthGuard('jwt'), SubscriptionRequiredGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async me(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.userService.findById(accessProfile.userId);
    }

    @Get('all')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async findAll(@GetQueryOptions() options: QueryOptions<User>, @Query('name') name?: string) {
        return this.userService.findAll({ name }, options);
    }

    @Get('tenant-admins')
    @UseGuards(AuthGuard('jwt'))
    async getTenantAdmins(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.userService.getTenantAdmins(accessProfile.tenantId);
    }

    /**
     * Get user by UUID (public-facing endpoint)
     * Use UUID for security and privacy
     */
    @Get(':uuid')
    @UseGuards(AuthGuard('jwt'))
    async findOneByUuid(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<User> {
        return this.userService.findByUuid(accessProfile, uuid);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findMany(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('name') name?: string,
        @GetQueryOptions() options?: QueryOptions<User>,
    ) {
        const queryOptions: QueryOptions<User> = {
            ...options,
            relations: ['department', 'role'],
        };

        return this.userService.findManyUsers(
            accessProfile,
            {
                name,
            },
            queryOptions,
        );
    }

    @Get(':email')
    @UseGuards(AuthGuard('jwt'))
    async findByEmail(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: FindOneQueryOptions<User>,
        @Param('email') email: string,
    ) {
        return this.userService.findByEmail(accessProfile, email, options);
    }

    @Get('department/:departmentId')
    @UseGuards(AuthGuard('jwt'))
    async findByDeparment(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<User>,
        @Param('departmentId', ParseIntPipe) departmentId: number,
    ) {
        return this.userService.findBy(accessProfile, {
            ...options,
            where: { ...options.where, departmentId },
        });
    }

    @Post('super-admin')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async SuperAdminCreate(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() createUserDto: SuperAdminCreateUserDto,
    ) {
        return this.userService.superAdminCreate(accessProfile, createUserDto);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(
        @Body() createUserDto: CreateUserDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.userService.create(accessProfile, createUserDto);
    }

    /**
     * Update user by UUID (public-facing endpoint)
     */
    @Patch(':uuid')
    @UseGuards(AuthGuard('jwt'))
    async updateByUuid(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @Body() updateUserDto: UpdateUserDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<User> {
        return this.userService.updateUserByUuid(accessProfile, uuid, updateUserDto);
    }

    @Patch('super-admin/:id')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async superAdminUpdate(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserDto: UpdateUserDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.userService.superAdminUpdate(accessProfile, id, updateUserDto);
    }
}
