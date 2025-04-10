import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll() {
        return this.userService.findAll();
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

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.update(id, updateUserDto);
    }
}
