export class UserRankingItemDto {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    departmentName: string;
    totalTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    efficiencyScore: number; // Wilson Score for ranking
    averageAcceptanceTimeSeconds: number;
    averageResolutionTimeSeconds: number;
    overdueRate: number; // Percentage of completed tickets that were overdue (completedAt > dueAt)
    avatarUrl?: string;
    isActive: boolean;
}

export class UserRankingResponseDto {
    users: UserRankingItemDto[];
}
