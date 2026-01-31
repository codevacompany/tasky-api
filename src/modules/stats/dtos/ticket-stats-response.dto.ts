export class DepartmentStatsDto {
    departmentId: number;
    departmentName: string;
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTimeSeconds: number;
    averageAcceptanceTimeSeconds: number;
    resolutionRate: number;
    efficiencyScore?: number;
    sentToVerificationOverdueRate: number; // Percentage of completed tickets that were sent to verification after dueAt
    completionOverdueRate: number; // Percentage of completed tickets that were actually completed after dueAt
    userCount: number;
}

export class DetailedMetricsDto {
    sentToVerificationOnTime: number; // Number of tickets sent to verification before dueAt
    totalCompleted: number; // Total number of completed tickets
    totalClosed: number; // Total number of closed tickets (completed + rejected)
    completionIndexTicketsTotal: number; // Total number of tickets in completion index
    onTimeVerified: number; // Number of verification cycles completed on time (within 24h)
    totalVerified: number; // Total number of verification cycles
    rejectedCount: number; // Total number of rejections
    returnedCount: number; // Total number of tickets that were returned
    totalEntries: number; // Total number of ticket assignments
    completionIndex: number; // Wilson Score for completion (0-1)
    verificationIndex: number; // Quality index based on on-time verification rate (0-1)
    rejectionIndex: number; // Quality index based on rejection rate (0-1)
    returnIndex: number; // Quality index based on return rate (0-1)
}

export class TicketStatsResponseDto {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    resolvedTickets: number;
    averageResolutionTimeSeconds: number;
    averageAcceptanceTimeSeconds: number;
    resolutionRate: number;
    efficiencyScore?: number;
    sentToVerificationOverdueRate: number; // Percentage of completed tickets that were sent to verification after dueAt
    detailedMetrics?: DetailedMetricsDto; // Optional detailed metrics for user stats explanation
}
