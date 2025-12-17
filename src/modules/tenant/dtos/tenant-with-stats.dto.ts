export interface UserWithStats {
    id: number;
    uuid: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentName: string;
    role: string;
    isActive: boolean;
    lastAccess?: string;
    loginCount?: number;
    lastLogin?: string | Date | null;
}

export interface SubscriptionInfo {
    planName?: string;
    planSlug?: string;
    maxUsers?: number;
    status?: string;
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
    subscription?: SubscriptionInfo;
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
