export class DepartmentStatsDto {
    departmentId: number;
    departmentName: string;
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTimeSeconds: number;
    averageAcceptanceTimeSeconds: number;
    averageTotalTimeSeconds: number;
    resolutionRate: number;
    efficiencyScore: number;
    overdueRate: number; // Percentage of completed tickets that were overdue (completedAt > dueAt)
    userCount: number;
}

export class TicketStatsResponseDto {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    resolvedTickets: number;
    averageResolutionTimeSeconds: number;
    averageAcceptanceTimeSeconds: number;
    averageTotalTimeSeconds: number;
    resolutionRate: number;
}
