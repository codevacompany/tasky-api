import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { CustomNotFoundException } from '../../shared/exceptions/http-exception';
import { TicketRepository } from '../ticket/ticket.repository';
import { TicketService } from '../ticket/ticket.service';
import { CreateChecklistItemDto } from './dtos/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dtos/update-checklist-item.dto';
import { TicketChecklistItem } from './entities/ticket-checklist-item.entity';

@Injectable()
export class TicketChecklistService {
    constructor(
        @InjectRepository(TicketChecklistItem)
        private readonly checklistItemRepository: Repository<TicketChecklistItem>,
        private readonly ticketRepository: TicketRepository,
        private readonly ticketService: TicketService,
    ) {}

    async getByTicket(
        accessProfile: AccessProfile,
        ticketId: number,
    ): Promise<TicketChecklistItem[]> {
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

        return this.checklistItemRepository.find({
            where: { ticketId, tenantId: accessProfile.tenantId },
            relations: ['assignedTo'],
            order: { order: 'ASC' },
        });
    }

    async createItem(
        accessProfile: AccessProfile,
        dto: CreateChecklistItemDto,
    ): Promise<TicketChecklistItem> {
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

        // Get max order for this checklist
        const maxOrderResult = await this.checklistItemRepository
            .createQueryBuilder('item')
            .where('item.ticketId = :ticketId', { ticketId: dto.ticketId })
            .select('MAX(item.order)', 'maxOrder')
            .getRawOne();

        const maxOrder = maxOrderResult?.maxOrder ?? -1;

        const item = this.checklistItemRepository.create({
            title: dto.title,
            ticketId: dto.ticketId,
            assignedToId: dto.assignedToId,
            dueDate: dto.dueDate,
            tenantId: accessProfile.tenantId,
            createdById: accessProfile.userId,
            updatedById: accessProfile.userId,
            order: dto.order ?? maxOrder + 1,
        });

        const savedItem = await this.checklistItemRepository.save(item);
        await this.ticketService.notifyTicketUpdate(accessProfile, dto.ticketId);
        return savedItem;
    }

    async updateItem(
        accessProfile: AccessProfile,
        id: number,
        dto: UpdateChecklistItemDto,
    ): Promise<TicketChecklistItem> {
        const item = await this.checklistItemRepository.findOne({
            where: { id, tenantId: accessProfile.tenantId },
            relations: ['assignedTo'],
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

        const savedItem = await this.checklistItemRepository.save(item);
        await this.ticketService.notifyTicketUpdate(accessProfile, item.ticketId);
        return savedItem;
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

        const ticketId = item.ticketId;
        await this.checklistItemRepository.remove(item);
        await this.ticketService.notifyTicketUpdate(accessProfile, ticketId);
    }
}
