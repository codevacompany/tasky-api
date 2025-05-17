import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { QueryOptions } from '../../shared/types/http';
import { CompleteSignUpDto } from './dtos/complete-sign-up.dto';
import { CreateSignUpDto } from './dtos/create-sign-up.dto';
import { SignUp } from './entities/sign-up.entity';
import { SignUpService } from './sign-up.service';

@Controller('sign-up')
export class SignUpController {
    constructor(private readonly signUpService: SignUpService) {}

    @Post()
    create(@Body() createSignUpDto: CreateSignUpDto) {
        return this.signUpService.create(createSignUpDto);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    findAll(
        @GetQueryOptions() options: QueryOptions<SignUp>,
        @Query('companyName') companyName?: string,
        @Query('status') status?: string,
    ) {
        return this.signUpService.findAll({ companyName, status }, options);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.signUpService.findOne(id);
    }

    @Get('activation/:token')
    getByActivationToken(@Param('token') token: string) {
        return this.signUpService.findByActivationToken(token);
    }

    @Patch(':id/approve')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    approveSignUp(@Param('id', ParseIntPipe) id: number) {
        return this.signUpService.approveSignUp(id);
    }

    @Patch(':id/reject')
    @UseGuards(AuthGuard('jwt'), GlobalAdminGuard)
    rejectSignUp(@Param('id', ParseIntPipe) id: number) {
        return this.signUpService.rejectSignUp(id);
    }

    @Post('complete/:token')
    @HttpCode(HttpStatus.NO_CONTENT)
    completeSignUp(@Param('token') token: string, @Body() completeSignUpDto: CompleteSignUpDto) {
        return this.signUpService.completeSignUp(
            token,
            completeSignUpDto.customKey,
            completeSignUpDto.password,
        );
    }
}
