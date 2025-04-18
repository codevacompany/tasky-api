import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TicketActionType } from '../entities/ticket-update.entity';
import { TicketStatus } from '../../ticket/entities/ticket.entity';

export class CreateTicketUpdateDto {
  @IsNumber()
  @IsNotEmpty()
  ticketId: number;

  @IsEnum(TicketActionType)
  @IsNotEmpty()
  action: TicketActionType;

  @IsEnum(TicketStatus)
  @IsOptional()
  fromStatus?: TicketStatus;

  @IsEnum(TicketStatus)
  @IsOptional()
  toStatus?: TicketStatus;

  @IsString()
  @IsOptional()
  description?: string;
}

