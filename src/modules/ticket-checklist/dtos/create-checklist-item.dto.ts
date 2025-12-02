import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChecklistItemDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsNumber()
    ticketId: number;

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

