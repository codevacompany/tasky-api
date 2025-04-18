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
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { QueryOptions } from '../../shared/types/http';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserService } from './user.service';
import { SuperAdminCreateUserDto } from './dtos/super-admin-create-user.dto copy';
import { GetUser } from '../../shared/decorators/get-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll(@GetUser() user: User, @GetQueryOptions() options: QueryOptions<User>, @Query('name') name?: string) {
        return this.userService.findAll(user, { name }, options);
    }

    @Get(':email')
    @UseGuards(AuthGuard('jwt'))
    async findByEmail(@Param('email') email: string) {
        return this.userService.findByEmail(email);
    }

    @Get('department/:departmentId')
    @UseGuards(AuthGuard('jwt'))
    async findByDeparment(@Param('departmentId', ParseIntPipe) departmentId: number) {
        return this.userService.findBy({ departmentId });
    }

    @Post('super-admin')
    @UseGuards(AuthGuard('jwt'))
    async SuperAdminCreate(@Body() createUserDto: SuperAdminCreateUserDto) {
        return this.userService.superAdminCreate(createUserDto);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() createUserDto: CreateUserDto, @GetUser() user: User) {
        
        return this.userService.create(user, createUserDto, user.tenantId);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto, @GetUser() user: User) {
        return this.userService.update(user, id, updateUserDto);
    }
}
