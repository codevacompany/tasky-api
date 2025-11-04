import { DataSource, Repository } from 'typeorm';
import { Seeder } from '@jorgebodega/typeorm-seeding';
import { Tenant } from '../../modules/tenant/entities/tenant.entity';
import { StatusColumn } from '../../modules/status-column/entities/status-column.entity';
import { TicketStatus } from '../../modules/ticket-status/entities/ticket-status.entity';

export class StatusColumnSeeder extends Seeder {
    async run(dataSource: DataSource): Promise<void> {
        console.log('📋 Seeding status columns and ticket statuses for existing tenants...');

        const tenantRepository = dataSource.getRepository(Tenant);
        const statusColumnRepository = dataSource.getRepository(StatusColumn);
        const ticketStatusRepository = dataSource.getRepository(TicketStatus);

        // Get all existing tenants
        const tenants = await tenantRepository.find();
        console.log(`Found ${tenants.length} tenant(s) to process`);

        let initializedCount = 0;
        let skippedCount = 0;

        for (const tenant of tenants) {
            // Check if tenant already has status columns
            const existingColumns = await statusColumnRepository.count({
                where: { tenantId: tenant.id },
            });

            if (existingColumns > 0) {
                console.log(
                    `⏭️  Tenant "${tenant.name}" (ID: ${tenant.id}) already has status columns, skipping...`,
                );
                skippedCount++;
                continue;
            }

            console.log(
                `🔧 Initializing status columns for tenant "${tenant.name}" (ID: ${tenant.id})...`,
            );

            // Step 1: Create default status columns
            const columns = await this.createDefaultColumns(statusColumnRepository, tenant.id);

            // Step 2: Create default ticket statuses
            await this.createDefaultStatuses(ticketStatusRepository, tenant.id, columns);

            initializedCount++;
            console.log(`✅ Initialized status columns for tenant "${tenant.name}"`);
        }

        console.log(`\n✅ Status column seeding completed!`);
        console.log(`   - Initialized: ${initializedCount} tenant(s)`);
        console.log(`   - Skipped: ${skippedCount} tenant(s) (already had columns)`);
    }

    /**
     * Create default status columns for kanban board
     */
    private async createDefaultColumns(
        repository: Repository<StatusColumn>,
        tenantId: number,
    ): Promise<StatusColumn[]> {
        const defaultColumns = [
            { name: 'Pendente', index: 1, isDefault: true, isDisableable: false },
            { name: 'Em andamento', index: 2, isDefault: true, isDisableable: false },
            { name: 'Aguardando verificação', index: 3, isDefault: true, isDisableable: true },
            { name: 'Em verificação', index: 4, isDefault: true, isDisableable: true },
            { name: 'Finalizado', index: 5, isDefault: true, isDisableable: false },
        ];

        const columns = defaultColumns.map((col) =>
            repository.create({
                ...col,
                tenantId,
                isActive: true,
            }),
        );

        return await repository.save(columns);
    }

    /**
     * Create default ticket statuses and map them to status columns
     */
    private async createDefaultStatuses(
        repository: Repository<TicketStatus>,
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
            repository.create({
                ...status,
                tenantId,
            }),
        );

        return await repository.save(statuses);
    }
}
