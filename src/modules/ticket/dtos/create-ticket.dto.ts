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

    @IsNotEmpty()
    @IsString()
    status: string;

    @IsDateString()
    creationDate: string;

    @IsOptional()
    @IsDateString()
    completionDate: string | null;

    @IsNotEmpty()
    @IsString()
    disapprovalReason: string;

    @IsNotEmpty()
    @IsInt()
    departmentId: number;
}
