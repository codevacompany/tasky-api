import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateChecklistItemDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsBoolean()
    isCompleted?: boolean;

    @IsOptional()
    @IsNumber()
    assignedToId?: number;

    @IsOptional()
    @Type(() => Date)
    dueDate?: Date;

    @IsOptional()
    @IsNumber()
    order?: number;
}

