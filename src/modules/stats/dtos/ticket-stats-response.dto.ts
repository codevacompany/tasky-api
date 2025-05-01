export class DepartmentStatsDto {
    departmentId: number;
    departmentName: string;
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTimeSeconds: number;
    resolutionRate: number;
}

export class TicketStatsResponseDto {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    averageResolutionTimeSeconds: number;
    averageAcceptanceTimeSeconds: number;
    resolutionRate: number;
    ticketsByDepartment: DepartmentStatsDto[];
}
