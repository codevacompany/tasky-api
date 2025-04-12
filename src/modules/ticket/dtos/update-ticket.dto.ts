import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';

export class UpdateTicketDto {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsEnum(TicketPriority)
    priority?: TicketPriority;

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    description?: string;

    @IsOptional()
    @IsDateString()
    creationDate?: string;

    @IsOptional()
    @IsDateString()
    dueAt?: string | null;

    // @IsOptional()
    // @IsNotEmpty()
    // @IsString()
    // disapprovalReason?: string;

    @IsOptional()
    @IsInt()
    departmentId?: number;

    @IsOptional()
    @IsInt()
    targetUserId?: number;

    @IsOptional()
    @IsInt()
    categoryId?: number;

    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean;
}
