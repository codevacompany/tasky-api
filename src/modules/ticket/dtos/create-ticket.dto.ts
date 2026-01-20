import {
    IsNotEmpty,
    IsString,
    MinLength,
    IsEnum,
    IsOptional,
    IsDateString,
    IsInt,
    IsBoolean,
    IsArray,
    ArrayMaxSize,
    ArrayMinSize,
    IsNumber,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketPriority } from '../entities/ticket.entity';

export class FileMetadataDto {
    @IsNotEmpty()
    @IsString()
    url: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    mimeType: string;

    @IsOptional()
    @IsNumber()
    size?: number;
}

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

    @IsOptional()
    @IsInt()
    reviewerId?: number;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => FileMetadataDto)
    files?: FileMetadataDto[];

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateTicketChecklistItemDto)
    checklistItems?: CreateTicketChecklistItemDto[];
}

export class CreateTicketChecklistItemDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsOptional()
    @IsNumber()
    assignedToId?: number;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsNumber()
    order?: number;
}
