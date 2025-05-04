export class DepartmentStatsDto {
    departmentId: number;
    departmentName: string;
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTimeSeconds: number;
    averageAcceptanceTimeSeconds: number;
    averageTotalTimeSeconds: number;
    resolutionRate: number;
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
