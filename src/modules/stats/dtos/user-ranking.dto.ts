export class UserRankingItemDto {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    departmentName: string;
    totalTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    avatarUrl?: string;
}

export class UserRankingResponseDto {
    users: UserRankingItemDto[];
}
