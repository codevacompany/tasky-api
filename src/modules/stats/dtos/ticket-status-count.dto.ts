import { TicketStatus } from '../../ticket/entities/ticket.entity';

export class TicketStatusCountDto {
    status: TicketStatus;
    count: number;
}

export class TicketStatusCountResponseDto {
    statusCounts: TicketStatusCountDto[];
    total: number;
}
