import {
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    Param,
    ParseBoolPipe,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { TermsAcceptanceRequiredGuard } from '../../shared/guards/terms-acceptance-required.guard';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';
import { CreateUserDto } from './dtos/create-user.dto';
import { SuperAdminCreateUserDto } from './dtos/super-admin-create-user.dto copy';
import { UpdateUserDto } from './dtos/update-user.dto';
import { AcceptTermsDto } from './dtos/accept-terms.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { FindOneQueryOptions, QueryOptions } from '../../shared/types/http';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.userService.findById(accessProfile.userId);
    }

    @Post('accept-terms')
    @UseGuards(JwtAuthGuard)
    async acceptTerms(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() acceptTermsDto: AcceptTermsDto,
    ) {
        return this.userService.acceptTerms(accessProfile.userId, acceptTermsDto);
    }

    @Post('complete-onboarding')
    @UseGuards(JwtAuthGuard)
    async completeOnboarding(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.userService.completeOnboarding(accessProfile.userId);
    }

    @Get('all')
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    async findAll(@GetQueryOptions() options: QueryOptions<User>, @Query('name') name?: string) {
        return this.userService.findAll({ name }, options);
    }

    @Get('tenant-admins')
    @UseGuards(JwtAuthGuard)
    async getTenantAdmins(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.userService.getTenantAdmins(accessProfile.tenantId);
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    async getTenantUserStats(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.userService.getTenantUserStats(accessProfile);
    }

    /**
     * Get user by UUID (public-facing endpoint)
     * Use UUID for security and privacy
     */
    @Get(':uuid')
    @UseGuards(JwtAuthGuard)
    async findOneByUuid(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<User> {
        return this.userService.findByUuid(accessProfile, uuid);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async findMany(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('name') name?: string,
        @Query('includeInactiveUsers', new DefaultValuePipe(false), ParseBoolPipe)
        includeInactiveUsers?: boolean,
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
            includeInactiveUsers,
        );
    }

    @Get(':email')
    @UseGuards(JwtAuthGuard)
    async findByEmail(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: FindOneQueryOptions<User>,
        @Param('email') email: string,
    ) {
        return this.userService.findByEmail(accessProfile, email, options);
    }

    @Get('department/:departmentId')
    @UseGuards(JwtAuthGuard)
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
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    async SuperAdminCreate(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() createUserDto: SuperAdminCreateUserDto,
    ) {
        return this.userService.superAdminCreate(accessProfile, createUserDto);
    }

    @Post()
    @UseGuards(JwtAuthGuard, SubscriptionRequiredGuard, TermsAcceptanceRequiredGuard)
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
    @UseGuards(JwtAuthGuard)
    async updateByUuid(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @Body() updateUserDto: UpdateUserDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<User> {
        return this.userService.updateUserByUuid(accessProfile, uuid, updateUserDto);
    }

    @Patch('super-admin/:id')
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    async superAdminUpdate(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserDto: UpdateUserDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.userService.superAdminUpdate(accessProfile, id, updateUserDto);
    }
}
