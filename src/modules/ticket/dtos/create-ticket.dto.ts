import { IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsDateString, IsInt } from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;

    @IsEnum(TicketPriority)
    priority: TicketPriority;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsOptional()
    @IsDateString()
    completionDate?: string | null;

    @IsNotEmpty()
    @IsInt()
    departmentId: number;

    @IsNotEmpty()
    @IsInt()
    requesterId: number;

    @IsOptional()
    @IsInt()
    targetUserId?: number;
}
