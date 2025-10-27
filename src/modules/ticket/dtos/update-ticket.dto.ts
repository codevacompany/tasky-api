import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
    IsArray,
    ArrayMaxSize,
    ArrayMinSize,
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
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(3)
    @IsInt({ each: true })
    targetUserIds?: number[];

    @IsOptional()
    @IsInt()
    categoryId?: number;

    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean;
}
