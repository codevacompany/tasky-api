import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ILike, Between } from 'typeorm';
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
import { TenantStatsResponseDto } from './dtos/tenant-with-stats.dto';
import { Tenant } from './entities/tenant.entity';
import { TenantRepository } from './tenant.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { startOfMonth, endOfMonth } from 'date-fns';
import { TenantSubscriptionService } from '../tenant-subscription/tenant-subscription.service';
import { TicketStatusInitService } from '../ticket-status/ticket-status-init.service';

@Injectable()
export class TenantService {
    constructor(
        private tenantRepository: TenantRepository,
        private legalDocumentService: LegalDocumentService,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Ticket)
        private ticketRepository: Repository<Ticket>,
        @Inject(forwardRef(() => TenantSubscriptionService))
        private tenantSubscriptionService: TenantSubscriptionService,
        private ticketStatusInitService: TicketStatusInitService,
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

    async findByCustomKey(customKey: string): Promise<Tenant> {
        return await this.tenantRepository.findOne({
            where: {
                customKey,
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

        const savedTenant = await this.tenantRepository.save(Tenant);

        await this.ticketStatusInitService.initializeTenantStatuses(savedTenant.id);

        return savedTenant;
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

    //TODO: Refactor to get the name from the options.where
    async findWithStats(
        where?: { name?: string },
        options?: QueryOptions<Tenant>,
    ): Promise<TenantStatsResponseDto> {
        const query = this.buildQuery(where || {});

        const [tenants, total] = await this.tenantRepository.findAndCount({
            where: query.where,
            skip: ((options?.page || 1) - 1) * (options?.limit || 10),
            take: options?.limit || 10,
            order: { name: 'ASC' },
        });

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const [totalUsers, totalMonthlyTickets] = await Promise.all([
            this.userRepository.count(),
            this.ticketRepository.count({
                where: {
                    createdAt: Between(monthStart, monthEnd),
                },
            }),
        ]);

        const tenantsWithStatsPromises = tenants.map(async (tenant) => {
            const [users, allTickets, ticketsThisMonth, subscriptionSummary] = await Promise.all([
                this.userRepository.find({
                    where: { tenantId: tenant.id },
                    relations: ['department', 'role'],
                }),
                this.ticketRepository.find({
                    where: { tenantId: tenant.id },
                }),
                this.ticketRepository.count({
                    where: {
                        tenantId: tenant.id,
                        createdAt: Between(monthStart, monthEnd),
                    },
                }),
                this.tenantSubscriptionService.getSubscriptionSummary(tenant.id),
            ]);

            const userStats = users.map((user) => ({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                departmentName: user.department?.name || 'N/A',
                role: user.role?.name || 'N/A',
                isActive: user.isActive,
            }));

            return {
                id: tenant.id,
                name: tenant.name,
                cnpj: tenant.cnpj,
                email: tenant.email,
                customKey: tenant.customKey,
                isActive: true,
                createdAt: tenant.createdAt?.toISOString() || '',
                updatedAt: tenant.updatedAt?.toISOString() || '',
                totalUsers: users.length,
                activeUsers: users.filter((user) => user.isActive).length,
                totalTickets: allTickets.length,
                ticketsThisMonth,
                users: userStats,
                subscription: subscriptionSummary.hasSubscription
                    ? {
                          planName: subscriptionSummary.subscription?.planName,
                          planSlug: subscriptionSummary.subscription?.planSlug,
                          maxUsers: subscriptionSummary.subscription?.maxUsers,
                          status: subscriptionSummary.subscription?.status,
                          trialEndDate: subscriptionSummary.subscription?.trialEndDate,
                      }
                    : undefined,
            };
        });

        const tenantsWithStats = await Promise.all(tenantsWithStatsPromises);

        return {
            items: tenantsWithStats,
            total,
            page: options?.page || 1,
            limit: options?.limit || 10,
            totalPages: Math.ceil(total / (options?.limit || 10)),
            globalStats: {
                totalActiveClients: total, // All tenants are considered active for now
                totalUsers,
                totalMonthlyTickets,
            },
        };
    }

    private buildQuery(where: { name?: string }) {
        const queryWhere: any = { ...where };

        if (where.name) {
            queryWhere.name = ILike(`%${where.name}%`);
        }

        return { where: queryWhere };
    }
}
