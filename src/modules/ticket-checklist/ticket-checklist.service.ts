import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomNotFoundException } from '../../shared/exceptions/http-exception';
import { Ticket } from '../ticket/entities/ticket.entity';
import { TicketRepository } from '../ticket/ticket.repository';
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { CreateChecklistItemDto } from './dtos/create-checklist-item.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { UpdateChecklistItemDto } from './dtos/update-checklist-item.dto';
import { TicketChecklist } from './entities/ticket-checklist.entity';
import { TicketChecklistItem } from './entities/ticket-checklist-item.entity';
import { TicketChecklistRepository } from './ticket-checklist.repository';

@Injectable()
export class TicketChecklistService extends TenantBoundBaseService<TicketChecklist> {
    constructor(
        private ticketChecklistRepository: TicketChecklistRepository,
        @InjectRepository(TicketChecklistItem)
        private checklistItemRepository: Repository<TicketChecklistItem>,
        private ticketRepository: TicketRepository,
    ) {
        super(ticketChecklistRepository);
    }

    async create(accessProfile: AccessProfile, dto: CreateChecklistDto): Promise<TicketChecklist> {
        // Verify ticket exists and belongs to tenant
        const ticket = await this.ticketRepository.findOne({
            where: { id: dto.ticketId, tenantId: accessProfile.tenantId },
        });

        if (!ticket) {
            throw new CustomNotFoundException({
                message: 'Ticket not found',
                code: 'ticket-not-found',
            });
        }

        // Get max order for this ticket
        const maxOrderResult = await this.ticketChecklistRepository
            .createQueryBuilder('checklist')
            .where('checklist.ticketId = :ticketId', { ticketId: dto.ticketId })
            .select('MAX(checklist.order)', 'maxOrder')
            .getRawOne();

        const maxOrder = maxOrderResult?.maxOrder ?? -1;

        const checklist = this.ticketChecklistRepository.create({
            title: dto.title,
            ticketId: dto.ticketId,
            tenantId: accessProfile.tenantId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            order: maxOrder + 1,
        });

        return this.ticketChecklistRepository.save(checklist);
    }

    async updateChecklist(
        accessProfile: AccessProfile,
        id: number,
        dto: UpdateChecklistDto,
    ): Promise<TicketChecklist> {
        const checklist = await this.findOne(accessProfile, {
            where: { id },
            relations: ['items'],
        });

        if (!checklist) {
            throw new CustomNotFoundException({
                message: 'Checklist not found',
                code: 'checklist-not-found',
            });
        }

        if (dto.title !== undefined) {
            checklist.title = dto.title;
        }
        if (dto.order !== undefined) {
            checklist.order = dto.order;
        }

        checklist.updatedById = accessProfile.userId;

        return this.ticketChecklistRepository.save(checklist);
    }

    async delete(accessProfile: AccessProfile, id: number): Promise<void> {
        const checklist = await this.findOne(accessProfile, {
            where: { id },
        });

        if (!checklist) {
            throw new CustomNotFoundException({
                message: 'Checklist not found',
                code: 'checklist-not-found',
            });
        }

        await this.ticketChecklistRepository.remove(checklist);
    }

    async getByTicket(
        accessProfile: AccessProfile,
        ticketId: number,
    ): Promise<TicketChecklist[]> {
        // Verify ticket exists and belongs to tenant
        const ticket = await this.ticketRepository.findOne({
            where: { id: ticketId, tenantId: accessProfile.tenantId },
        });

        if (!ticket) {
            throw new CustomNotFoundException({
                message: 'Ticket not found',
                code: 'ticket-not-found',
            });
        }

        return this.ticketChecklistRepository.find({
            where: { ticketId, tenantId: accessProfile.tenantId },
            relations: ['items', 'items.assignedTo'],
            order: { order: 'ASC', items: { order: 'ASC' } },
        });
    }

    async createItem(
        accessProfile: AccessProfile,
        dto: CreateChecklistItemDto,
    ): Promise<TicketChecklistItem> {
        // Verify checklist exists and belongs to tenant
        const checklist = await this.findOne(accessProfile, {
            where: { id: dto.checklistId },
        });

        if (!checklist) {
            throw new CustomNotFoundException({
                message: 'Checklist not found',
                code: 'checklist-not-found',
            });
        }

        // Get max order for this checklist
        const maxOrderResult = await this.checklistItemRepository
            .createQueryBuilder('item')
            .where('item.checklistId = :checklistId', { checklistId: dto.checklistId })
            .select('MAX(item.order)', 'maxOrder')
            .getRawOne();

        const maxOrder = maxOrderResult?.maxOrder ?? -1;

        const item = this.checklistItemRepository.create({
            title: dto.title,
            checklistId: dto.checklistId,
            assignedToId: dto.assignedToId,
            dueDate: dto.dueDate,
            tenantId: accessProfile.tenantId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            order: dto.order ?? maxOrder + 1,
        });

        return this.checklistItemRepository.save(item);
    }

    async updateItem(
        accessProfile: AccessProfile,
        id: number,
        dto: UpdateChecklistItemDto,
    ): Promise<TicketChecklistItem> {
        const item = await this.checklistItemRepository.findOne({
            where: { id, tenantId: accessProfile.tenantId },
            relations: ['checklist'],
        });

        if (!item) {
            throw new CustomNotFoundException({
                message: 'Checklist item not found',
                code: 'checklist-item-not-found',
            });
        }

        if (dto.title !== undefined) {
            item.title = dto.title;
        }
        if (dto.isCompleted !== undefined) {
            item.isCompleted = dto.isCompleted;
        }
        if (dto.assignedToId !== undefined) {
            item.assignedToId = dto.assignedToId;
        }
        if (dto.dueDate !== undefined) {
            item.dueDate = dto.dueDate;
        }
        if (dto.order !== undefined) {
            item.order = dto.order;
        }

        item.updatedById = accessProfile.userId;

        return this.checklistItemRepository.save(item);
    }

    async deleteItem(accessProfile: AccessProfile, id: number): Promise<void> {
        const item = await this.checklistItemRepository.findOne({
            where: { id, tenantId: accessProfile.tenantId },
        });

        if (!item) {
            throw new CustomNotFoundException({
                message: 'Checklist item not found',
                code: 'checklist-item-not-found',
            });
        }

        await this.checklistItemRepository.remove(item);
    }
}

