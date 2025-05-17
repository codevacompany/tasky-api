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
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { FindOneQueryOptions, QueryOptions } from '../../shared/types/http';
import { CreateUserDto } from './dtos/create-user.dto';
import { SuperAdminCreateUserDto } from './dtos/super-admin-create-user.dto copy';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findMany(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<User>,
        @Query('name') name?: string,
    ) {
        return this.userService.findManyUsers(accessProfile, { name }, options);
    }

    //TODO: add a role/permission validation decorator
    @Get('all')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    async findAll(@GetQueryOptions() options: QueryOptions<User>, @Query('name') name?: string) {
        return this.userService.findAll({ name }, options);
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

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserDto: UpdateUserDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.userService.update(accessProfile, id, updateUserDto);
    }
}
