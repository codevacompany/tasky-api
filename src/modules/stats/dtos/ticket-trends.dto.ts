export class TrendDataPointDto {
    date: string; // ISO string
    total: number;
    resolved: number;
    created: number;
}

export class TicketTrendsResponseDto {
    daily: TrendDataPointDto[];
    weekly: TrendDataPointDto[];
    monthly: TrendDataPointDto[];
    trimestral: TrendDataPointDto[];
}
