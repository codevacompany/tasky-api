import { TicketStatus } from '../../ticket/entities/ticket.entity';

export class StatusDurationDto {
    status: TicketStatus;
    averageDurationSeconds: number;
    totalDurationSeconds: number;
    count: number;
}

export class StatusDurationResponseDto {
    statusDurations: StatusDurationDto[];
}
