import { IsOptional, IsString } from 'class-validator';

export class UpdateChecklistDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    order?: number;
}

