import { TicketPriority } from '../../ticket/entities/ticket.entity';

export class TicketPriorityCountDto {
    priority: TicketPriority;
    count: number;
}

export class TicketPriorityCountResponseDto {
    priorityCounts: TicketPriorityCountDto[];
    total: number;
}
