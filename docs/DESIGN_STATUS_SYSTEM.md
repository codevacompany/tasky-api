# Customizable Ticket Status System - Simplified Design

## Overview

This design enables tenant-level customization of ticket status workflows with a simplified, maintainable structure. The system separates kanban columns from ticket statuses and provides configurable actions.

## Core Principles

1. **Status Columns**: Kanban board columns are separate from ticket statuses
2. **Default Statuses**: All current TicketStatus enum values become default statuses per tenant
3. **Default Columns**: Core columns (Pendente, Em andamento, etc.) are created per tenant
4. **Customizable**: Tenants can add custom statuses and columns
5. **Backward Compatibility**: Default statuses keep existing logic (no StatusAction records needed)

## Database Schema

### 1. StatusColumn

Kanban board columns that organize tickets visually.

```typescript
@Entity()
@Index(['tenantId', 'index'], { unique: true })
export class StatusColumn extends TenantBoundBaseEntity {
    @Column()
    name: string; // 'Pendente', 'Em andamento', etc.

    @Column()
    index: number; // Order for kanban columns (1, 2, 3...)

    @Column({ default: false })
    isDefault: boolean; // Cannot be deleted if true

    @Column({ default: false })
    isDisableable: boolean; // Some defaults can be disabled but not deleted

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => TicketStatus, (status) => status.statusColumn)
    statuses: TicketStatus[];
}
```

### 2. TicketStatus

Actual ticket statuses that map to columns.

```typescript
@Entity()
@Index(['tenantId', 'key'], { unique: true })
export class TicketStatus extends TenantBoundBaseEntity {
    @Column()
    key: string; // 'pendente', 'em_andamento', 'finalizado', etc. (technical identifier)

    @Column()
    name: string; // 'Pendente', 'Em andamento', 'Finalizado', etc. (display name)

    @Column()
    statusColumnId: number;

    @ManyToOne(() => StatusColumn, (column) => column.statuses)
    @JoinColumn({ name: 'statusColumnId' })
    statusColumn: StatusColumn;

    @Column({ default: false })
    isDefault: boolean; // Default statuses keep existing logic

    @OneToMany(() => StatusAction, (action) => action.fromStatus)
    actions: StatusAction[];

    @OneToMany(() => Ticket, (ticket) => ticket.status)
    tickets: Ticket[];
}
```

### 3. StatusAction

Custom actions for non-default statuses (optional).

```typescript
@Entity()
@Index(['tenantId', 'fromStatusId', 'toStatusId'], { unique: true })
export class StatusAction extends TenantBoundBaseEntity {
    @Column()
    fromStatusId: number;

    @ManyToOne(() => TicketStatus, (status) => status.actions)
    @JoinColumn({ name: 'fromStatusId' })
    fromStatus: TicketStatus;

    @Column()
    title: string; // Button title (e.g., 'Aprovar', 'Reprovar')

    @Column({ nullable: true })
    toStatusId: number; // Target status after action

    @ManyToOne(() => TicketStatus, { nullable: true })
    @JoinColumn({ name: 'toStatusId' })
    toStatus: TicketStatus;
}
```

### 4. Ticket Entity Update

```typescript
// Legacy field kept for backward compatibility
@Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.Pending,
})
status: string;

// New field pointing to TicketStatus entity
@Column({ nullable: true })
statusId: number;

@ManyToOne(() => TicketStatus, (ticketStatus) => ticketStatus.tickets, { nullable: true })
@JoinColumn({ name: 'statusId' })
ticketStatus: TicketStatus;
```

## Default Configuration on Tenant Creation

When a tenant is created, the system automatically:

### 1. Creates Default Status Columns

-   **Pendente** (index: 1, isDefault: true, isDisableable: false)
-   **Em andamento** (index: 2, isDefault: true, isDisableable: true)
-   **Aguardando verificação** (index: 3, isDefault: true, isDisableable: true)
-   **Em verificação** (index: 4, isDefault: true, isDisableable: true)
-   **Finalizado** (index: 5, isDefault: true, isDisableable: false)

### 2. Creates Default Ticket Statuses

Maps each status to its corresponding column:

| Key                    | Name                   | Column                 | isDefault |
| ---------------------- | ---------------------- | ---------------------- | --------- |
| pendente               | Pendente               | Pendente               | true      |
| devolvido              | Devolvido              | Pendente               | true      |
| em_andamento           | Em andamento           | Em andamento           | true      |
| aguardando_verificação | Aguardando verificação | Aguardando verificação | true      |
| em_verificação         | Em verificação         | Em verificação         | true      |
| finalizado             | Finalizado             | Finalizado             | true      |
| cancelado              | Cancelado              | Finalizado             | true      |
| reprovado              | Reprovado              | Finalizado             | true      |

## Implementation Details

### Service: TicketStatusInitService

Initializes default status columns and ticket statuses for a new tenant.

```typescript
async initializeTenantStatuses(tenantId: number): Promise<void>
```

Called automatically when a tenant is created via `TenantService.create()`.

### Business Logic

-   **Default Statuses**: Keep existing logic (check by status name)
-   **Custom Statuses**: Use StatusAction table to determine available actions
-   **Kanban Board**: Fetch columns ordered by `index`, group tickets by `statusColumnId`

## Migration Strategy

### Phase 1: Add New Tables (Non-breaking)

1. Create `status_column`, `ticket_status`, `status_action` tables
2. Add `statusId` column to `ticket` table (nullable)
3. Keep existing `status` enum column

### Phase 2: Initialize Existing Tenants

1. For each existing tenant, run `initializeTenantStatuses()`
2. This creates default columns and statuses

### Phase 3: Migrate Tickets

1. Map existing ticket `status` enum values to `TicketStatus` records
2. Update `statusId` for all tickets
3. Example: `TicketStatus.Pending` → find `TicketStatus` with `name='pendente'`

### Phase 4: Remove Legacy (Optional)

1. Remove `status` enum column
2. Update all code to use `statusId` exclusively

## Benefits

1. **Simplicity**: Only 3 tables needed
2. **Flexibility**: Tenants can customize columns and statuses
3. **Backward Compatibility**: Default statuses work with existing logic
4. **Scalability**: Easy to add custom statuses and actions
5. **Maintainability**: Clear separation of concerns

## Usage Notes

-   Default statuses (`isDefault: true`) use existing business logic (no StatusAction needed)
-   Custom statuses can use StatusAction table to define button actions
-   Columns can be disabled (`isActive: false`) but default ones cannot be deleted
-   Statuses are grouped by column for kanban visualization
