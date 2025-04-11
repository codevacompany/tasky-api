import { IsEnum, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '../entities/ticket.entity';

export class UpdateTicketStatusDto {
    @IsNotEmpty()
    @IsEnum(TicketStatus)
    status: string;
}
