import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusColumn } from '../status-column/entities/status-column.entity';
import { TicketStatus } from './entities/ticket-status.entity';

/**
 * Service to initialize default status columns and ticket statuses for a new tenant
 */
@Injectable()
export class TicketStatusInitService {
    constructor(
        @InjectRepository(StatusColumn)
        private statusColumnRepository: Repository<StatusColumn>,
        @InjectRepository(TicketStatus)
        private ticketStatusRepository: Repository<TicketStatus>,
    ) {}

    /**
     * Initialize default status columns and ticket statuses for a tenant
     */
    async initializeTenantStatuses(tenantId: number): Promise<void> {
        // Step 1: Create default status columns
        const columns = await this.createDefaultColumns(tenantId);

        // Step 2: Create default ticket statuses and map them to columns
        await this.createDefaultStatuses(tenantId, columns);
    }

    /**
     * Create default status columns for kanban board
     */
    private async createDefaultColumns(tenantId: number): Promise<StatusColumn[]> {
        const defaultColumns = [
            { name: 'Pendente', index: 1, isDefault: true, isDisableable: false },
            { name: 'Em andamento', index: 2, isDefault: true, isDisableable: false },
            { name: 'Aguardando verificação', index: 3, isDefault: true, isDisableable: true },
            { name: 'Em verificação', index: 4, isDefault: true, isDisableable: true },
            { name: 'Finalizado', index: 5, isDefault: true, isDisableable: false },
        ];

        const columns = defaultColumns.map((col) =>
            this.statusColumnRepository.create({
                ...col,
                tenantId,
                isActive: true,
            }),
        );

        return await this.statusColumnRepository.save(columns);
    }

    /**
     * Create default ticket statuses and map them to status columns
     */
    private async createDefaultStatuses(
        tenantId: number,
        columns: StatusColumn[],
    ): Promise<TicketStatus[]> {
        // Find columns by name for mapping
        const pendenteColumn = columns.find((c) => c.name === 'Pendente')!;
        const emAndamentoColumn = columns.find((c) => c.name === 'Em andamento')!;
        const aguardandoVerificacaoColumn = columns.find(
            (c) => c.name === 'Aguardando verificação',
        )!;
        const emVerificacaoColumn = columns.find((c) => c.name === 'Em verificação')!;
        const finalizadoColumn = columns.find((c) => c.name === 'Finalizado')!;

        // Map statuses to columns as per requirements:
        // - Pending and Returned → Pendente column
        // - InProgress → Em andamento column
        // - AwaitingVerification → Aguardando verificação column
        // - UnderVerification → Em verificação column
        // - Completed, Canceled, Rejected → Finalizado column

        const defaultStatuses = [
            {
                key: 'pendente',
                name: 'Pendente',
                statusColumnId: pendenteColumn.id,
                isDefault: true,
            },
            {
                key: 'devolvido',
                name: 'Devolvido',
                statusColumnId: pendenteColumn.id,
                isDefault: true,
            },
            {
                key: 'em_andamento',
                name: 'Em andamento',
                statusColumnId: emAndamentoColumn.id,
                isDefault: true,
            },
            {
                key: 'aguardando_verificação',
                name: 'Aguardando verificação',
                statusColumnId: aguardandoVerificacaoColumn.id,
                isDefault: true,
            },
            {
                key: 'em_verificação',
                name: 'Em verificação',
                statusColumnId: emVerificacaoColumn.id,
                isDefault: true,
            },
            {
                key: 'finalizado',
                name: 'Finalizado',
                statusColumnId: finalizadoColumn.id,
                isDefault: true,
            },
            {
                key: 'cancelado',
                name: 'Cancelado',
                statusColumnId: finalizadoColumn.id,
                isDefault: true,
            },
            {
                key: 'reprovado',
                name: 'Reprovado',
                statusColumnId: finalizadoColumn.id,
                isDefault: true,
            },
        ];

        const statuses = defaultStatuses.map((status) =>
            this.ticketStatusRepository.create({
                ...status,
                tenantId,
            }),
        );

        return await this.ticketStatusRepository.save(statuses);
    }
}
