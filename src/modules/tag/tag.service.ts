import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomBadRequestException,
    CustomConflictException,
    CustomForbiddenException,
    CustomNotFoundException,
} from '../../shared/exceptions/http-exception';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { Department } from '../department/entities/department.entity';
import { RoleName } from '../role/entities/role.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { User } from '../user/entities/user.entity';
import { CreateTagDto } from './dtos/create-tag.dto';
import { UpdateTagDto } from './dtos/update-tag.dto';
import { Tag } from './entities/tag.entity';
import { TicketTag } from './entities/ticket-tag.entity';
import { TagRepository } from './tag.repository';

type TagActor = {
    userId: number;
    departmentId: number | null;
    isTenantAdmin: boolean;
    isSupervisor: boolean;
};

@Injectable()
export class TagService extends TenantBoundBaseService<Tag> {
    constructor(
        private readonly tagRepository: TagRepository,
        @InjectRepository(TicketTag)
        private readonly ticketTagRepository: Repository<TicketTag>,
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        super(tagRepository);
    }

    async findMany(
        accessProfile: AccessProfile,
        options?: QueryOptions<Tag> & {
            q?: string;
            activeOnly?: boolean;
            /** When true, supervisors only see tags suggested for their department. */
            sectorScope?: boolean;
        },
    ): Promise<PaginatedResponse<Tag>> {
        const qb = this.tagRepository
            .createQueryBuilder('tag')
            .leftJoinAndSelect('tag.suggestedForDepartments', 'suggestedForDepartments')
            .where('tag.tenantId = :tenantId', { tenantId: accessProfile.tenantId });

        const activeOnly = options?.activeOnly !== false;
        if (activeOnly) {
            qb.andWhere('tag.isActive = true');
        }

        const q = (options as any)?.q || (options?.where as any)?.name;
        if (q && typeof q === 'string') {
            qb.andWhere('tag.name ILIKE :q', { q: `%${q.trim()}%` });
        }

        if (options?.sectorScope) {
            const actor = await this.resolveActor(accessProfile);
            if (actor.isSupervisor) {
                if (!actor.departmentId) {
                    throw new CustomBadRequestException({
                        code: 'supervisor-without-department',
                        message: 'Supervisor must belong to a department to manage sector tags',
                    });
                }
                qb.andWhere(
                    `EXISTS (
                        SELECT 1 FROM tag_suggested_for_department td
                        WHERE td."tagId" = tag.id AND td."departmentId" = :sectorDeptId
                    )`,
                    { sectorDeptId: actor.departmentId },
                );
            }
        }

        qb.orderBy('tag.name', 'ASC');

        const page = options?.page || 1;
        const limit = options?.limit || 50;
        qb.skip((page - 1) * limit).take(limit);

        const [items, total] = await qb.getManyAndCount();
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    async findSuggested(
        accessProfile: AccessProfile,
        params: { ticketCustomId?: string; limit?: number },
    ): Promise<Tag[]> {
        const limit = Math.min(params.limit || 12, 50);
        const contextDepartmentIds = new Set<number>();

        const currentUser = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
            select: ['id', 'departmentId'],
        });

        if (currentUser?.departmentId) {
            contextDepartmentIds.add(currentUser.departmentId);
        }

        let appliedTagIds: number[] = [];

        if (params.ticketCustomId) {
            const ticket = await this.ticketRepository.findOne({
                where: { customId: params.ticketCustomId, tenantId: accessProfile.tenantId },
                relations: [
                    'requester',
                    'currentTargetUser',
                    'targetUsers',
                    'targetUsers.user',
                    'ticketTags',
                ],
            });

            if (ticket) {
                if (ticket.requester?.departmentId) {
                    contextDepartmentIds.add(ticket.requester.departmentId);
                }
                if (ticket.currentTargetUser?.departmentId) {
                    contextDepartmentIds.add(ticket.currentTargetUser.departmentId);
                }
                for (const tu of ticket.targetUsers || []) {
                    if (tu.user?.departmentId) {
                        contextDepartmentIds.add(tu.user.departmentId);
                    }
                }
                appliedTagIds = (ticket.ticketTags || []).map((tt) => tt.tagId);
            }
        }

        const qb = this.tagRepository
            .createQueryBuilder('tag')
            .leftJoinAndSelect('tag.suggestedForDepartments', 'dept')
            .where('tag.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere('tag.isActive = true');

        if (appliedTagIds.length) {
            qb.andWhere('tag.id NOT IN (:...appliedTagIds)', { appliedTagIds });
        }

        const deptIds = [...contextDepartmentIds];
        if (deptIds.length) {
            qb.andWhere(
                `(NOT EXISTS (
                    SELECT 1 FROM tag_suggested_for_department td WHERE td."tagId" = tag.id
                ) OR EXISTS (
                    SELECT 1 FROM tag_suggested_for_department td
                    WHERE td."tagId" = tag.id AND td."departmentId" IN (:...deptIds)
                ))`,
                { deptIds },
            );
        } else {
            qb.andWhere(
                `NOT EXISTS (SELECT 1 FROM tag_suggested_for_department td WHERE td."tagId" = tag.id)`,
            );
        }

        qb.orderBy('tag.name', 'ASC').take(limit);
        return qb.getMany();
    }

    async findByUuid(accessProfile: AccessProfile, uuid: string): Promise<Tag> {
        const tag = await this.tagRepository.findOne({
            where: { uuid, tenantId: accessProfile.tenantId },
            relations: ['suggestedForDepartments'],
        });

        if (!tag) {
            throw new CustomNotFoundException({
                code: 'not-found',
                message: 'Tag not found.',
            });
        }

        return tag;
    }

    async create(accessProfile: AccessProfile, dto: CreateTagDto): Promise<Tag> {
        const actor = await this.resolveActor(accessProfile);
        const name = dto.name.trim();
        await this.assertNameAvailable(accessProfile, name);

        const departmentIds = await this.resolveCreateDepartmentIds(
            actor,
            dto.suggestedForDepartmentIds,
        );

        const tag = this.tagRepository.create({
            name,
            color: dto.color.toUpperCase(),
            isActive: true,
            tenantId: accessProfile.tenantId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
        });

        tag.suggestedForDepartments = await this.resolveDepartments(accessProfile, departmentIds);

        return this.tagRepository.save(tag);
    }

    async updateTagByUuid(
        accessProfile: AccessProfile,
        uuid: string,
        dto: UpdateTagDto,
    ): Promise<Tag> {
        const actor = await this.resolveActor(accessProfile);
        const tag = await this.findByUuid(accessProfile, uuid);
        this.assertSupervisorCanMutate(actor, tag);

        if (dto.name !== undefined) {
            const name = dto.name.trim();
            if (name.toLowerCase() !== tag.name.toLowerCase()) {
                await this.assertNameAvailable(accessProfile, name, tag.id);
            }
            tag.name = name;
        }

        if (dto.color !== undefined) {
            tag.color = dto.color.toUpperCase();
        }

        if (dto.isActive !== undefined) {
            tag.isActive = dto.isActive;
        }

        if (dto.suggestedForDepartmentIds !== undefined) {
            const departmentIds = await this.resolveUpdateDepartmentIds(
                actor,
                dto.suggestedForDepartmentIds,
            );
            tag.suggestedForDepartments = await this.resolveDepartments(
                accessProfile,
                departmentIds,
            );
        }

        tag.updatedById = accessProfile.userId;
        return this.tagRepository.save(tag);
    }

    async deleteTagByUuid(accessProfile: AccessProfile, uuid: string): Promise<void> {
        const actor = await this.resolveActor(accessProfile);
        const tag = await this.findByUuid(accessProfile, uuid);
        this.assertSupervisorCanMutate(actor, tag);

        const usageCount = await this.ticketTagRepository.count({
            where: { tagId: tag.id, tenantId: accessProfile.tenantId },
        });

        if (usageCount > 0) {
            throw new CustomBadRequestException({
                code: 'tag-in-use',
                message: `Cannot delete tag because it is being used by ${usageCount} ticket(s)`,
            });
        }

        await this.tagRepository.remove(tag);
    }

    private async resolveActor(accessProfile: AccessProfile): Promise<TagActor> {
        const user = await this.userRepository.findOne({
            where: { id: accessProfile.userId, tenantId: accessProfile.tenantId },
            relations: ['role'],
        });

        if (!user) {
            throw new CustomNotFoundException({
                code: 'user-not-found',
                message: 'User not found',
            });
        }

        const roleName = user.role?.name;
        return {
            userId: user.id,
            departmentId: user.departmentId ?? null,
            isTenantAdmin: roleName === RoleName.TenantAdmin || roleName === RoleName.GlobalAdmin,
            isSupervisor: roleName === RoleName.Supervisor,
        };
    }

    private assertSupervisorCanMutate(actor: TagActor, tag: Tag): void {
        if (actor.isTenantAdmin) return;
        if (!actor.isSupervisor) {
            throw new CustomForbiddenException({
                code: 'forbidden',
                message: 'You cannot modify this tag',
            });
        }
        if (tag.createdById !== actor.userId) {
            throw new CustomForbiddenException({
                code: 'tag-not-owned',
                message: 'Supervisors can only edit tags they created',
            });
        }
    }

    private async resolveCreateDepartmentIds(
        actor: TagActor,
        departmentIds?: number[],
    ): Promise<number[]> {
        if (actor.isTenantAdmin) {
            return departmentIds ?? [];
        }

        if (!actor.isSupervisor || !actor.departmentId) {
            throw new CustomForbiddenException({
                code: 'forbidden',
                message: 'Supervisors must belong to a department to create tags',
            });
        }

        // Supervisors cannot create global tags — always scoped to their department.
        return [actor.departmentId];
    }

    private async resolveUpdateDepartmentIds(
        actor: TagActor,
        departmentIds: number[],
    ): Promise<number[]> {
        if (actor.isTenantAdmin) {
            return departmentIds;
        }

        if (!actor.departmentId) {
            throw new CustomForbiddenException({
                code: 'forbidden',
                message: 'Supervisors must belong to a department to update tags',
            });
        }

        if (!departmentIds.length || !departmentIds.includes(actor.departmentId)) {
            throw new CustomBadRequestException({
                code: 'sector-scope-required',
                message: 'Supervisors cannot make tags global; keep their department in the scope',
            });
        }

        return departmentIds;
    }

    private async assertNameAvailable(
        accessProfile: AccessProfile,
        name: string,
        excludeId?: number,
    ): Promise<void> {
        const qb = this.tagRepository
            .createQueryBuilder('tag')
            .where('tag.tenantId = :tenantId', { tenantId: accessProfile.tenantId })
            .andWhere('LOWER(tag.name) = LOWER(:name)', { name });

        if (excludeId) {
            qb.andWhere('tag.id != :excludeId', { excludeId });
        }

        const exists = await qb.getOne();
        if (exists) {
            throw new CustomConflictException({
                code: 'name-already-registered',
                message: 'This name is already registered',
            });
        }
    }

    private async resolveDepartments(
        accessProfile: AccessProfile,
        departmentIds?: number[],
    ): Promise<Department[]> {
        if (!departmentIds?.length) {
            return [];
        }

        const departments = await this.departmentRepository.find({
            where: { id: In(departmentIds), tenantId: accessProfile.tenantId },
        });

        if (departments.length !== departmentIds.length) {
            throw new CustomBadRequestException({
                code: 'invalid-departments',
                message: 'One or more departments were not found in this tenant',
            });
        }

        return departments;
    }
}
