import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { QueryOptions } from '../../shared/types/http';
import { CreateLegalDocumentDto } from './dtos/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dtos/update-legal-document.dto';
import { LegalDocumentType } from './entities/legal-document.entity';
import { LegalDocumentService } from './legal-document.service';

@Controller('legal-documents')
export class LegalDocumentController {
    constructor(private readonly legalDocumentService: LegalDocumentService) {}

    @Post()
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    create(@Body() createLegalDocumentDto: CreateLegalDocumentDto) {
        return this.legalDocumentService.create(createLegalDocumentDto);
    }

    @Get('admin')
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    findAll(
        @GetQueryOptions() options: QueryOptions<any>,
        @Query('type') type?: LegalDocumentType,
        @Query('isActive') isActive?: boolean,
        @Query('language') language?: string,
        @Query('version') version?: string,
    ) {
        const filter = {
            type,
            isActive,
            language,
            version,
        };

        return this.legalDocumentService.findAll(filter, options);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.legalDocumentService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateLegalDocumentDto: UpdateLegalDocumentDto,
    ) {
        return this.legalDocumentService.update(id, updateLegalDocumentDto);
    }

    @Patch(':id/activate')
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    activate(@Param('id', ParseIntPipe) id: number) {
        return this.legalDocumentService.activateDocument(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, GlobalAdminGuard)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.legalDocumentService.remove(id);
    }

    @Get('public/active')
    findActiveDocuments(
        @Query('type') type?: LegalDocumentType,
        @Query('language') language?: string,
    ) {
        const filter = {
            isActive: true,
            type,
            language,
        };

        return this.legalDocumentService.findAll(filter);
    }

    @Get('public/type/:type')
    findActiveByType(@Param('type') type: LegalDocumentType) {
        return this.legalDocumentService.getActiveDocumentByType(type);
    }

    @Get('public/type/:type/version/:version')
    findByTypeAndVersion(
        @Param('type') type: LegalDocumentType,
        @Param('version') version: string,
    ) {
        return this.legalDocumentService.findByTypeAndVersion(type, version);
    }
}
