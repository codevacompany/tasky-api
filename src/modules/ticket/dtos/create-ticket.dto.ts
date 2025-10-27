import { IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsDateString, IsInt, IsBoolean, IsArray, ArrayMaxSize, ArrayMinSize } from 'class-validator';
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
    dueAt?: string | null;

    @IsNotEmpty()
    @IsInt()
    departmentId: number;

    @IsNotEmpty()
    @IsInt()
    requesterId: number;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(3)
    @IsInt({ each: true })
    targetUserIds: number[];

    @IsOptional()
    @IsInt()
    categoryId?: number;

    @IsOptional()
    @IsBoolean()
    isPrivate?: boolean;

    @IsArray()
    @IsOptional()
    files?: string[];
}
