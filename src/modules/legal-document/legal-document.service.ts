import { Injectable } from '@nestjs/common';
import {
    CustomBadRequestException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { CreateLegalDocumentDto } from './dtos/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dtos/update-legal-document.dto';
import { LegalDocument, LegalDocumentType } from './entities/legal-document.entity';
import { LegalDocumentRepository } from './legal-document.repository';

@Injectable()
export class LegalDocumentService {
    constructor(private readonly legalDocumentRepository: LegalDocumentRepository) {}

    async create(createLegalDocumentDto: CreateLegalDocumentDto): Promise<LegalDocument> {
        if (createLegalDocumentDto.isActive) {
            await this.deactivateOtherDocuments(createLegalDocumentDto.type, null);
        }

        const legalDocument = this.legalDocumentRepository.create({
            ...createLegalDocumentDto,
            effectiveDate: createLegalDocumentDto.effectiveDate || new Date(),
        });

        return this.legalDocumentRepository.save(legalDocument);
    }

    async findAll(
        filter?: {
            type?: LegalDocumentType;
            isActive?: boolean;
            language?: string;
            version?: string;
        },
        options?: QueryOptions<LegalDocument>,
    ): Promise<PaginatedResponse<LegalDocument>> {
        const where = { ...filter };

        const [items, total] = await this.legalDocumentRepository.findAndCount({
            where,
            skip: options ? (options.page - 1) * options.limit : 0,
            take: options?.limit || 10,
            order: options?.order || { createdAt: 'DESC' },
        });

        return {
            items,
            total,
            page: options?.page || 1,
            limit: options?.limit || 10,
            totalPages: Math.ceil(total / (options?.limit || 10)),
        };
    }

    async findOne(id: number): Promise<LegalDocument> {
        const legalDocument = await this.legalDocumentRepository.findOne({
            where: { id },
        });

        if (!legalDocument) {
            throw new CustomNotFoundException({
                code: 'legal-document-not-found',
                message: 'Legal document not found',
            });
        }

        return legalDocument;
    }

    async getActiveDocumentByType(type: LegalDocumentType): Promise<LegalDocument> {
        const legalDocument = await this.legalDocumentRepository.findOne({
            where: {
                type,
                isActive: true,
            },
        });

        if (!legalDocument) {
            throw new CustomNotFoundException({
                code: 'active-legal-document-not-found',
                message: `No active ${type} document found`,
            });
        }

        return legalDocument;
    }

    async findByTypeAndVersion(type: LegalDocumentType, version: string): Promise<LegalDocument> {
        const legalDocument = await this.legalDocumentRepository.findOne({
            where: {
                type,
                version,
            },
        });

        if (!legalDocument) {
            throw new CustomNotFoundException({
                code: 'legal-document-version-not-found',
                message: `${type} document version ${version} not found`,
            });
        }

        return legalDocument;
    }

    async update(
        id: number,
        updateLegalDocumentDto: UpdateLegalDocumentDto,
    ): Promise<LegalDocument> {
        const legalDocument = await this.findOne(id);

        if (updateLegalDocumentDto.isActive) {
            const type = updateLegalDocumentDto.type || legalDocument.type;
            await this.deactivateOtherDocuments(type, id);
        }

        await this.legalDocumentRepository.update(id, updateLegalDocumentDto);

        return this.findOne(id);
    }

    async activateDocument(id: number): Promise<LegalDocument> {
        const legalDocument = await this.findOne(id);
        await this.deactivateOtherDocuments(legalDocument.type, id);

        await this.legalDocumentRepository.update(id, { isActive: true });

        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        const legalDocument = await this.findOne(id);

        if (legalDocument.isActive) {
            throw new CustomBadRequestException({
                code: 'cannot-delete-active-document',
                message: 'Cannot delete an active legal document. Deactivate it first.',
            });
        }

        await this.legalDocumentRepository.delete(id);
    }

    private async deactivateOtherDocuments(
        type: LegalDocumentType,
        excludeId: number | null,
    ): Promise<void> {
        const query = this.legalDocumentRepository
            .createQueryBuilder()
            .update(LegalDocument)
            .set({ isActive: false })
            .where('type = :type', { type });

        if (excludeId) {
            query.andWhere('id != :excludeId', { excludeId });
        }

        await query.execute();
    }
}
