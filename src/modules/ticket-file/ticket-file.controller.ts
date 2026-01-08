import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
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

    @Get('storage/total')
    async getTotalStorage(@GetAccessProfile() accessProfile: AccessProfile) {
        const totalBytes = await this.ticketFileService.getTotalStorageUsed(accessProfile.tenantId);

        // Convert bytes to more readable formats
        const totalMB = totalBytes / (1024 * 1024);
        const totalGB = totalBytes / (1024 * 1024 * 1024);

        return {
            totalBytes,
            totalMB: parseFloat(totalMB.toFixed(2)),
            totalGB: parseFloat(totalGB.toFixed(4)),
        };
    }
}
