export interface UserWithStats {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    departmentName: string;
    role: string;
    isActive: boolean;
    lastAccess?: string;
}

export interface TenantWithStatsDto {
    id: number;
    name: string;
    cnpj?: string;
    email?: string;
    customKey: string;
    createdAt: string;
    updatedAt: string;
    totalUsers: number;
    activeUsers: number;
    totalTickets: number;
    ticketsThisMonth: number;
    users: UserWithStats[];
    isActive: boolean;
}

export interface GlobalStatsDto {
    totalActiveClients: number;
    totalUsers: number;
    totalMonthlyTickets: number;
}

export class TenantStatsResponseDto {
    items: TenantWithStatsDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    globalStats: GlobalStatsDto;
}
