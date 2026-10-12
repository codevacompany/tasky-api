import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantAdminOrSupervisorGuard } from '../../shared/guards/tenant-admin-or-supervisor.guard';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';
import { CreateTagDto } from './dtos/create-tag.dto';
import { UpdateTagDto } from './dtos/update-tag.dto';
import { Tag } from './entities/tag.entity';
import { TagService } from './tag.service';

@Controller('tags')
export class TagController {
    constructor(private readonly tagService: TagService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('q') q?: string,
        @Query('activeOnly') activeOnly?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sectorScope') sectorScope?: string,
    ) {
        return this.tagService.findMany(accessProfile, {
            q,
            activeOnly: activeOnly !== 'false',
            sectorScope: sectorScope === 'true',
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        } as any);
    }

    @Get('suggested')
    @UseGuards(JwtAuthGuard)
    async findSuggested(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Query('ticketCustomId') ticketCustomId?: string,
        @Query('limit') limit?: string,
    ): Promise<Tag[]> {
        return this.tagService.findSuggested(accessProfile, {
            ticketCustomId,
            limit: limit ? Number(limit) : 12,
        });
    }

    @Get(':uuid')
    @UseGuards(JwtAuthGuard)
    async findByUuid(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ): Promise<Tag> {
        return this.tagService.findByUuid(accessProfile, uuid);
    }

    @Post()
    @UseGuards(JwtAuthGuard, TenantAdminOrSupervisorGuard)
    async create(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() createTagDto: CreateTagDto,
    ): Promise<Tag> {
        return this.tagService.create(accessProfile, createTagDto);
    }

    @Patch(':uuid')
    @UseGuards(JwtAuthGuard, TenantAdminOrSupervisorGuard)
    async update(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @Body() updateTagDto: UpdateTagDto,
    ): Promise<Tag> {
        return this.tagService.updateTagByUuid(accessProfile, uuid, updateTagDto);
    }

    @Delete(':uuid')
    @UseGuards(JwtAuthGuard, TenantAdminOrSupervisorGuard)
    async delete(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Param('uuid', UUIDValidationPipe) uuid: string,
    ) {
        await this.tagService.deleteTagByUuid(accessProfile, uuid);
        return { message: 'Tag deleted successfully' };
    }
}
