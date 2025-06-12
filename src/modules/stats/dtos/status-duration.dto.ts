import { TicketStatus } from '../../ticket/entities/ticket.entity';

export class StatusDurationDto {
    status: TicketStatus;
    totalDurationSeconds: number;
    count: number;
    averageDurationSeconds: number;
}

export class StatusDurationResponseDto {
    statusDurations: StatusDurationDto[];
}

export class StatusDurationTimePointDto {
    month: string;
    value: number;
    count: number; // Number of tickets that contributed to this average
}

export class StatusDurationTimeSeriesResponseDto {
    status: TicketStatus;
    data: StatusDurationTimePointDto[];
    averageDuration: number; // Average across all months
}
