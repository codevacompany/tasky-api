import { Body, Controller, Delete, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { CreateTicketFileDto } from './dtos/create-ticket-file.dto';
import { TicketFileService } from './ticket-file.service';

@UseGuards(AuthGuard('jwt'))
@Controller('ticket-files')
export class TicketFileController {
    constructor(private readonly ticketFileService: TicketFileService) {}

    @Post()
    async create(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Body() dto: CreateTicketFileDto,
    ) {
        return this.ticketFileService.create(acessProfile, dto);
    }

    @Delete(':id')
    async delete(
        @GetAccessProfile() acessProfile: AccessProfile,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.ticketFileService.delete(acessProfile, id);
        return { message: 'Successfully deleted!' };
    }
}
