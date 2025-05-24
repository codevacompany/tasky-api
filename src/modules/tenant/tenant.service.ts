import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import {
    CustomBadRequestException,
    CustomConflictException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { LegalDocumentType } from '../legal-document/entities/legal-document.entity';
import { LegalDocumentService } from '../legal-document/legal-document.service';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantConsentDto } from './dtos/update-tenant-consent.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class TenantService {
    constructor(
        private tenantRepository: TenantRepository,
        private legalDocumentService: LegalDocumentService,
    ) {}

    async findAll(
        where?: { name: string },
        options?: QueryOptions<Tenant>,
    ): Promise<PaginatedResponse<Tenant>> {
        const query = this.buildQuery(where);

        const [items, total] = await this.tenantRepository.findAndCount({
            where: query.where,
            skip: (options.page - 1) * options.limit,
            take: options.limit,
        });

        return {
            items,
            total,
            page: options.page,
            limit: options.limit,
            totalPages: Math.ceil(total / options.limit),
        };
    }

    async findByCnpj(cnpj: string): Promise<Tenant> {
        return await this.tenantRepository.findOne({
            where: {
                cnpj,
            },
        });
    }

    async findByName(name: string): Promise<Tenant> {
        return await this.tenantRepository.findOne({
            where: {
                name,
            },
        });
    }

    async findById(id: number): Promise<Tenant> {
        const tenant = await this.tenantRepository.findOne({
            where: {
                id,
            },
        });

        if (!tenant) {
            throw new CustomNotFoundException({
                code: 'tenant-not-found',
                message: 'Tenant not found',
            });
        }

        return tenant;
    }

    async create(Tenant: CreateTenantDto) {
        const TenantExists = await this.tenantRepository.findOne({
            where: {
                name: Tenant.name,
            },
        });

        if (TenantExists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }

        return await this.tenantRepository.save(Tenant);
    }

    async update(id: number, Tenant: UpdateTenantDto) {
        await this.tenantRepository.update(id, Tenant);

        return {
            message: 'Successfully updated!',
            TenantId: id,
        };
    }

    async updateConsent(id: number, consentData: UpdateTenantConsentDto) {
        await this.findById(id);

        // Validate terms version exists
        try {
            await this.legalDocumentService.findByTypeAndVersion(
                LegalDocumentType.TERMS_OF_SERVICE,
                consentData.termsVersion,
            );
        } catch (error) {
            throw new CustomBadRequestException({
                code: 'invalid-terms-version',
                message: `Terms of service version ${consentData.termsVersion} not found`,
            });
        }

        // Validate privacy policy version exists
        try {
            await this.legalDocumentService.findByTypeAndVersion(
                LegalDocumentType.PRIVACY_POLICY,
                consentData.privacyPolicyVersion,
            );
        } catch (error) {
            throw new CustomBadRequestException({
                code: 'invalid-privacy-policy-version',
                message: `Privacy policy version ${consentData.privacyPolicyVersion} not found`,
            });
        }

        await this.tenantRepository.update(id, {
            ...consentData,
            termsAcceptedAt: new Date(),
            privacyPolicyAcceptedAt: new Date(),
        });

        return {
            message: 'Consent information updated successfully',
            tenantId: id,
        };
    }

    private buildQuery(where: { name: string }) {
        const queryWhere: any = { ...where };

        if (where.name) {
            queryWhere.name = ILike(`%${where.name}%`);
        }

        return { where: queryWhere };
    }
}
